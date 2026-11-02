import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { fetchLabModels, persistLabTurnState, reportLabEvents, buildWriteFileLogEvent, sendLabChat } from '../lib/ai'
import { isEntitlementDenied } from '../lib/entitlement'
import { publishCreditsExhausted, publishLabCredits } from '../lib/labCredits'
import { playDeskChime } from '../lib/deskChime'
import { commitFilesAtomic } from '../lib/files'
import {
    advanceTodosOnToolDone,
    advanceTodosOnToolStart,
    buildDiffRows,
    completeAllTodos,
    mergePlanTodos,
    observationSucceeded,
    pendingChromeFromToolCalls,
    planTodosFromRaw,
} from '../lib/chatTools'
import {
    LANES,
    SESSION_MODES,
    abortTurn,
    buildAgentContinuationPrompt,
    buildSessionStub,
    classifyIntent,
    packContext,
    recoverPseudoToolCalls,
    runOrchestratedTurn,
    toStageContract,
    AGENT_STAGES,
    stageForLane,
    stripWorkspaceMeta,
    stripThoughtBlock,
    stripSuggestions,
    stripTodos,
    toolBatchHasWrite,
    writeReject,
    probeSourceSyntax,
    healSourceSyntax,
    VFS_HEAL_COMPLETE,
    VFS_HEAL_START,
} from '../orchestration'
import { normalizeVfsPath } from '../lib/vfs'
import { useReplyShelf } from './useReplyShelf'
import { buildAutoRepairPrompt } from '../lib/labErrors'
import { previewEditsNeedUserText, slimPreviewEditsForWire, upsertEditTarget } from '../lib/previewEditTargets'
import { needsPhotograph, vfsHasPhotograph } from '../lib/briefSignals'
import { writeFailureHint } from '../lib/toolActivity'
import {
    BUILD_PROPOSAL_REJECTED_EVENT,
    discoveryReadyForBuild,
    packFiles,
    presentDiscoveryReply,
    sanitizeBuildReply,
    scrubLookupVisualQueries,
    scrubPseudoToolTags,
    streamReveal,
    USER_RESUME_BUILD_GATE,
    userContentForApi,
    waitUntil,
} from '../lib/labChatText'
import { adoptLabUrl, readLabHandoffBrief, setDocumentTitle } from '../lib/labUrl'
import {
    hasPaintedToolChrome,
    hasThinkingChrome,
    mergeTurnChrome,
    settleTurnChrome,
    shouldPersistTurnChrome,
    turnChromeMetadata,
    turnWrites,
    turnsFromMessages,
    uid,
    upsertChromeCard,
    upsertLookupVisualsStack,
    upsertToolStack,
} from '../lib/labTurns'
// Session token totals — record from chat responses
import { recordSessionUsage } from '../lib/sessionTokenCounter.jsx'
import { elapsedSecSince, isModelWaitLabel } from '../lib/labElapsed'
import { fallbackTurnRecap, needsTurnRecap, requestTurnRecap } from '../lib/turnRecap'

/**
 * Messaging state, model picker, shelf, send/stop pipeline.
 */
export function useLabChat({
    initialProject = null,
    building,
    setBuilding,
    projectUuid,
    setProjectUuid,
    projectTitle,
    setProjectTitle,
    setRailW,
    // VFS / stream
    refreshFileTree,
    applyVfsBatch,
    beginAiStream,
    endAiStream,
    cancelAiStream,
    vfsContentsRef,
    draftBuffersRef,
    fileTreeRef,
    workspaceViewRef,
    isAiStreamingRef,
    prevProjectUuidRef,
    // Shelf DOM refs owned by LabApp
    laneRef,
    latestRef,
    bubbleRefs,
    threadStackRef,
}) {
    const [turns, setTurns] = useState(() => turnsFromMessages(initialProject?.messages || []))
    const [draft, setDraftState] = useState(() => (
        initialProject?.messages?.length ? '' : readLabHandoffBrief()
    ))
    const [files, setFiles] = useState([])
    const [editTargets, setEditTargets] = useState([])
    const [busy, setBusy] = useState(false)
    const [anchorId, setAnchorId] = useState(null)
    const [modelId, setModelId] = useState(null)
    const [models, setModels] = useState([])
    const [turnStatusLabel, setTurnStatusLabel] = useState('')

    /** Latest send() for Skip event follow-ups (defined later). */
    const sendRef = useRef(null)
    /** AbortController for the in-flight orchestrated turn (Stop/Cancel). */
    const turnAbortRef = useRef(null)

    const live = turns.length > 0
    const latestTurn = turns[turns.length - 1]

    const {
        shelfTurnId,
        shelfMinHeight,
        beginShelf,
        shelfReady,
        showFollowButton,
        resumeFollow,
    } = useReplyShelf({
        live,
        building,
        busy,
        turns,
        latestTurn,
        anchorId,
        laneRef,
        latestRef,
        bubbleRefs,
        stackRef: threadStackRef,
        hasHistory: Boolean(initialProject?.messages?.length),
    })

    useEffect(() => {
        let cancelled = false
        fetchLabModels()
            .then((payload) => {
                if (cancelled) return
                setModels(payload.models || [])
                setModelId((current) => current || payload.default || null)
            })
            .catch(() => {
                /* picker can retry later; chat still posts with server default */
            })
        return () => {
            cancelled = true
        }
    }, [])

    const addFiles = useCallback((items) => {
        setFiles((cur) => [...cur, ...items])
    }, [])

    const removeFile = useCallback((id) => {
        setFiles((cur) => {
            const hit = cur.find((f) => f.id === id)
            if (hit?.url) URL.revokeObjectURL(hit.url)
            return cur.filter((f) => f.id !== id)
        })
    }, [])

    const addEditTarget = useCallback((target, opts = {}) => {
        if (! target) return
        setEditTargets((cur) => upsertEditTarget(cur, target))
        if (opts.focus === false) return
        try {
            window.dispatchEvent(new CustomEvent('krikkit-lab-focus-composer'))
        } catch {
            /* ignore */
        }
    }, [])

    const removeEditTarget = useCallback((id) => {
        setEditTargets((cur) => cur.filter((row) => row.id !== id))
    }, [])

    /** Ephemeral discovery chips — never persist; clear on type / send. */
    const clearSuggestions = useCallback(() => {
        setTurns((list) => {
            if (! list.some((t) => t.suggestions?.length)) return list
            return list.map((t) => (t.suggestions ? { ...t, suggestions: null } : t))
        })
    }, [])

    const setDraft = useCallback((value) => {
        clearSuggestions()
        setDraftState(value)
    }, [clearSuggestions])

    const effectiveSessionMode = building
        ? SESSION_MODES.BUILDING
        : SESSION_MODES.PLANNING

    const stopTurn = useCallback(() => {
        abortTurn(turnAbortRef.current)
        setTurnStatusLabel('Stopping…')
    }, [])

    const send = useCallback(async (payload) => {
        const text = (payload?.content || '').trim()
        const attached = payload?.attachments || []
        const targets = Array.isArray(payload?.editTargets) && payload.editTargets.length
            ? payload.editTargets
            : editTargets
        const autoRepair = payload?.autoRepair && payload.autoRepair.type === 'AUTO_REPAIR'
            ? payload.autoRepair
            : null
        const autoStartPayload = Boolean(payload?.autoStart)
        const systemEvent = Boolean(payload?.systemEvent)
        const followUpTurnId = payload?.followUpTurnId || null
        // Switch reuses the gate turn so the user bubble stays docked at the crest.
        const attachTurnId = payload?.attachTurnId || null
        // Switch / Skip = silent state triggers — never fabricate a user chat message.
        const silentTrigger = autoStartPayload || systemEvent
        if (busy) return
        if (! silentTrigger && ! autoRepair && previewEditsNeedUserText(targets) && ! text) return
        if (! silentTrigger && ! autoRepair && ! text && ! attached.length && ! targets.length) return

        // Dismiss ephemeral chips as soon as the user submits (or a silent trigger fires).
        clearSuggestions()

        // After Skip, “ok start” re-opens workspace and runs this turn as build.
        const resumeBuild = ! silentTrigger && ! autoRepair && USER_RESUME_BUILD_GATE.test(text)
        if (resumeBuild && ! building) {
            setRailW(null)
            setTurns((list) => list.map((t) => (
                t.buildGate === 'pending' ? { ...t, buildGate: 'accepted' } : t
            )))
            setBuilding(true)
        }

        if (autoRepair && ! building) {
            setRailW(null)
            setBuilding(true)
        }

        const autoStart = autoStartPayload || (resumeBuild && ! building)
        // Auto-repair always mutates VFS in the open workspace.
        const workspaceOpen = building || autoStart || resumeBuild || Boolean(autoRepair)
        const sessionMode = workspaceOpen ? SESSION_MODES.BUILDING : effectiveSessionMode
        // Any message while Workspace is open is a mutation turn (Turn 1…N) — never demote to chat.
        const forcedLane = systemEvent
            ? LANES.CHAT
            : (workspaceOpen ? LANES.BUILD : null)

        // Rejection follow-up must not re-arm the Build Card on the same turn.
        const gateDismissed = Boolean(systemEvent)

        const id = attachTurnId || followUpTurnId || uid()
        const waitStartedAt = Date.now()
        const initialTurnStatus = autoRepair
            ? 'Repairing…'
            : 'Waiting for model…'
        const packed = packFiles(attached)
        beginShelf(id)

        const prior = turns.flatMap((turn) => {
            const rows = []
            if (turn.user?.autoRepair) {
                rows.push({
                    role: 'user',
                    content: buildAutoRepairPrompt(turn.user.autoRepair),
                })
            } else if (turn.user?.text || turn.user?.files?.length) {
                rows.push({
                    role: 'user',
                    content: userContentForApi(turn.user.text || '', turn.user.files || []),
                })
            }
            if (turn.bot) {
                rows.push({ role: 'assistant', content: turn.bot })
            }
            if (turn.botFollowUp && ! (systemEvent && followUpTurnId && turn.id === followUpTurnId)) {
                rows.push({ role: 'assistant', content: turn.botFollowUp })
            }
            return rows
        })

        const visibleUserText = autoRepair
            ? `Automated Error Repair · ${autoRepair.file || autoRepair.component || 'preview'}`
            : text

        // Visible chat never gets the raw SYSTEM dump — server expands auto_repair / preview_edits for the LLM.
        const displayUserContent = autoRepair
            ? visibleUserText
            : userContentForApi(visibleUserText, packed)

        // Silent triggers reuse discovery history only — no synthetic user bubble in UI/DB.
        // Skip still needs a trailing user turn for Claude (assistant-last = prefill / empty).
        let messages = silentTrigger
            ? [...prior]
            : [...prior, { role: 'user', content: displayUserContent }]

        if (systemEvent) {
            messages = [
                ...messages,
                { role: 'user', content: BUILD_PROPOSAL_REJECTED_EVENT },
            ]
        }

        if (silentTrigger && messages.length === 0) {
            return
        }

        if (attachTurnId) {
            // Reuse the Build Gate turn: keep user + discovery bot + all painted chrome
            // (thinking, tool cards) — Switch must not wipe in-progress UI. The build
            // stream overwrites thinking/tools as its own events arrive.
            setTurns((list) => list.map((t) => (t.id === attachTurnId ? {
                ...t,
                buildGate: 'accepted',
                skipDivider: false,
                botFollowUp: null,
                thinking: t.thinking ? { ...t.thinking, status: 'done' } : null,
                vfsHeal: null,
                turnStatus: initialTurnStatus,
                // Fresh timer: the user may have sat on the Build Gate for minutes.
                waitStartedAt,
            } : t)))
        } else if (followUpTurnId) {
            setTurns((list) => list.map((t) => (t.id === followUpTurnId ? {
                ...t,
                buildGate: 'skipped',
                skipDivider: true,
                // AI streams into botFollowUp — never seed static Skip copy.
                botFollowUp: t.botFollowUp?.trim() ? t.botFollowUp : null,
                turnStatus: initialTurnStatus,
                // Fresh timer: decision time on the gate is not model wait time.
                waitStartedAt,
            } : t)))
        } else {
            setTurns((list) => [...list, {
                id,
                // Auto-repair paints AutoRepairCard — never the raw SYSTEM prompt.
                user: silentTrigger
                    ? { text: '', files: [] }
                    : (autoRepair
                        ? { text: '', files: [], autoRepair }
                        : { text: visibleUserText, files: packed, editTargets: targets.length ? targets : null }),
                bot: null,
                botFollowUp: null,
                skipDivider: false,
                thinking: null,
                todos: null,
                listDir: null,
                listDirs: [],
                fileSearch: null,
                fileSearches: [],
                grep: null,
                greps: [],
                readFile: null,
                reads: [],
                editFile: null,
                edits: [],
                shell: null,
                fetch: null,
                writeFile: null,
                writes: [],
                toolStack: [],
                buildGate: null,
                callouts: null,
                vfsHeal: null,
                turnStatus: initialTurnStatus,
                waitStartedAt,
                suggestions: null,
            }])
        }
        setAnchorId(id)
        if (! silentTrigger) {
            setDraft('')
            setFiles([])
            setEditTargets([])
        }
        setBusy(true)
        setTurnStatusLabel(initialTurnStatus)
        beginAiStream()

        const abortController = new AbortController()
        turnAbortRef.current = abortController

        const intentSeed = silentTrigger
            ? (prior.filter((m) => m.role === 'user').at(-1)?.content || (autoStart ? 'implement discovery decisions' : 'continue'))
            : (autoRepair
                ? `fix ${autoRepair.errorType === 'BUILD_ERROR' ? 'build' : 'runtime'} error with write_file`
                : text)

        // Stage ContextPack contract before the model call (Router/Planner/Executor inject).
        const intentPreview = classifyIntent({
            text: systemEvent
                ? 'user rejected build proposal — ask what to change'
                : intentSeed,
            sessionMode,
            explicitLane: forcedLane,
            selectedPath: workspaceViewRef.current?.activePath || null,
            hasAttachments: packed.length > 0,
            workspaceOpen,
        })
        // Workspace / executor stage always — tools + tool_choice:required on every follow-up.
        const stage = workspaceOpen
            ? AGENT_STAGES.EXECUTOR
            : stageForLane(intentPreview.lane)
        const previewContents = { ...vfsContentsRef.current, ...draftBuffersRef.current }
        const photographicBrief = needsPhotograph(intentSeed) || needsPhotograph(projectTitle || '')
        const forceLookupVisuals = workspaceOpen
            && ! autoRepair
            && photographicBrief
            && ! vfsHasPhotograph(previewContents)
        const contextPack = toStageContract(stage, packContext({
            lane: intentPreview.lane,
            sessionStub: buildSessionStub({
                sessionMode,
                projectTitle,
                activePath: workspaceViewRef.current?.activePath || null,
            }),
            tree: fileTreeRef.current,
            contents: previewContents,
            messages,
            hotPaths: [
                workspaceViewRef.current?.activePath || null,
                autoRepair?.file || null,
            ].filter(Boolean),
            safetyFlags: {
                nativeTools: true,
                ...(autoStartPayload ? { silentBuild: true } : {}),
                ...(systemEvent ? { proposalRejected: true } : {}),
                ...(autoRepair ? { autoRepair: true } : {}),
                ...(targets.length ? { previewEdits: true } : {}),
                ...(forceLookupVisuals ? { forceLookupVisuals: true } : {}),
            },
        }))

        const streamQueue = []
        let streamReady = false
        let streamThoughtLive = false
        let streamThoughtStartedAt = 0
        let streamProposedWorkspace = false
        /** @type {(event: { type?: string, [key: string]: unknown }) => void} */
        let applyChatStreamEvent = () => {}
        const onChatStreamEvent = (event) => {
            if (! streamReady) {
                streamQueue.push(event)
                return
            }
            applyChatStreamEvent(event)
        }

        const chatPromise = sendLabChat({
            model: modelId || undefined,
            project: projectUuid || undefined,
            messages,
            stage,
            context_pack: contextPack,
            ...(forceLookupVisuals
                ? {
                    tool_choice: {
                        type: 'function',
                        function: { name: 'lookup_visuals' },
                    },
                }
                : {}),
            // Server expands auto_repair into the hidden SYSTEM prompt for the LLM.
            auto_repair: autoRepair || undefined,
            preview_edits: (! autoRepair && targets.length) ? slimPreviewEditsForWire(targets) : undefined,
            // Never persist fabricated transition prompts as user chat history.
            persist_user: ! silentTrigger,
        }, { signal: abortController.signal, onEvent: onChatStreamEvent })

        await waitUntil(() => shelfReady(id) || abortController.signal.aborted)

        // Mirror of turn chrome for DB persistence (setState is async).
        const liveChrome = {
            thinking: null,
            todos: null,
            listDir: null,
            listDirs: [],
            fileSearch: null,
            fileSearches: [],
            grep: null,
            greps: [],
            readFile: null,
            reads: [],
            editFile: null,
            edits: [],
            shell: null,
            fetch: null,
            writeFile: null,
            writes: [],
            toolStack: [],
            buildGate: null,
            callouts: null,
            vfsHeal: null,
            writeFilePostHeal: false,
            botFollowUp: null,
            skipDivider: false,
            bot: null,
            turnStatus: initialTurnStatus,
            waitStartedAt,
        }

        /** @type {number|null} */
        let assistantMessageId = null
        /** @type {string|null} */
        let persistUuid = projectUuid || null
        /** @type {ReturnType<typeof setTimeout>|null} */
        let chromePersistTimer = null

        const flushChromePersist = async () => {
            if (chromePersistTimer) {
                clearTimeout(chromePersistTimer)
                chromePersistTimer = null
            }
            if (! persistUuid || ! shouldPersistTurnChrome(liveChrome)) return
            const metadata = turnChromeMetadata(liveChrome)
            if (! Object.keys(metadata).length) return
            try {
                await persistLabTurnState(persistUuid, {
                    ...(assistantMessageId ? { message_id: assistantMessageId } : {}),
                    metadata,
                })
                // Do NOT re-spread liveChrome into React here. That async snapshot
                // used to nullify turn.thinking when tool PUTs raced the thought.
            } catch (persistError) {
                console.warn('[lab] turn chrome persist failed', persistError)
            }
        }

        const persistSettledChrome = async ({ content, failed = false } = {}) => {
            if (! persistUuid || ! assistantMessageId) return
            if (chromePersistTimer) {
                clearTimeout(chromePersistTimer)
                chromePersistTimer = null
            }
            const settled = settleTurnChrome(liveChrome, { failed })
            Object.keys(settled).forEach((key) => {
                liveChrome[key] = settled[key]
            })
            const metadata = turnChromeMetadata(liveChrome)
            if (! Object.keys(metadata).length && content == null) return
            try {
                await persistLabTurnState(persistUuid, {
                    message_id: assistantMessageId,
                    ...(content != null ? { content } : {}),
                    metadata: Object.keys(metadata).length ? metadata : { turnStatus: '' },
                })
            } catch (persistError) {
                console.warn('[lab] turn chrome persist failed', persistError)
            }
        }

        const scheduleChromePersist = () => {
            if (! persistUuid || ! shouldPersistTurnChrome(liveChrome)) return
            if (chromePersistTimer) clearTimeout(chromePersistTimer)
            chromePersistTimer = setTimeout(() => {
                chromePersistTimer = null
                void flushChromePersist()
            }, 450)
        }

        const patchTurn = (fields) => {
            const patch = { ...(fields && typeof fields === 'object' ? fields : {}) }
            // New wait phases restart the clock (write → next model call).
            // Swapping "Waiting for model…" / "Starting build…" must not rewind 18s to 0.
            if (
                typeof patch.turnStatus === 'string'
                && patch.turnStatus.trim() !== ''
                && patch.turnStatus !== liveChrome.turnStatus
                && patch.waitStartedAt === undefined
                && ! (isModelWaitLabel(liveChrome.turnStatus) && isModelWaitLabel(patch.turnStatus))
            ) {
                patch.waitStartedAt = Date.now()
            }
            // Merge so tool / status patches never wipe established thought text.
            // Semantics: event.thought ?? state.thought (retain prior when omitted/null).
            const nextChrome = mergeTurnChrome(liveChrome, patch)
            Object.keys(nextChrome).forEach((key) => {
                liveChrome[key] = nextChrome[key]
            })

            setTurns((list) => list.map((t) => {
                if (t.id !== id) return t
                const next = mergeTurnChrome(t, patch)
                if (hasThinkingChrome(liveChrome) && ! hasThinkingChrome(next)) {
                    next.thinking = liveChrome.thinking
                }
                return next
            }))
            if (
                patch.thinking !== undefined
                || patch.todos !== undefined
                || patch.listDir !== undefined
                || patch.listDirs !== undefined
                || patch.fileSearch !== undefined
                || patch.fileSearches !== undefined
                || patch.grep !== undefined
                || patch.greps !== undefined
                || patch.readFile !== undefined
                || patch.reads !== undefined
                || patch.editFile !== undefined
                || patch.edits !== undefined
                || patch.shell !== undefined
                || patch.fetch !== undefined
                || patch.writeFile !== undefined
                || patch.writes !== undefined
                || patch.toolStack !== undefined
                || patch.vfsHeal !== undefined
            ) {
                // Persist once thinking is done (or tools paint) — not every stream frame.
                if (patch.thinking !== undefined) {
                    const status = liveChrome.thinking?.status
                    if (status && status !== 'done') return
                }
                scheduleChromePersist()
            }
        }

        const writeCardHasDiff = (card) => (
            Boolean(card?.path)
            && card.status === 'done'
            && Array.isArray(card.rows)
            && card.rows.length > 0
        )

        // SSE tool_end carries the full write_file body. Settle Wrote + +/- +
        // diff immediately so cards don't sit as "Wrote" with an empty panel
        // until the executor drains the whole batch after HTTP closes.
        //
        // Pre-stream bodies of stream-settled paths. Settling writes the body
        // into draft buffers, and refreshFileTree merges drafts back into the
        // hydrated contents — so the orchestrator's "canonical" baseline would
        // already contain this turn's writes. pendingWrites() would then see
        // identical content, skip those files, and the disk commit would miss
        // them (preview works from memory; a new tab loads a broken project).
        // Restoring these bodies keeps the commit diff honest.
        /** @type {Record<string, string|null>} */
        const preStreamBodies = Object.create(null)

        const settleWriteFromStream = (rawArgs = {}) => {
            const path = normalizeVfsPath(String(rawArgs?.path || ''))
            let after = typeof rawArgs?.content === 'string' ? rawArgs.content : ''
            if (! path || after === '') return false
            if (writeReject(path, after)) return false
            const healed = healSourceSyntax(path, after)
            if (healed.healed) after = healed.body
            else if (probeSourceSyntax(path, after).length) return false

            const existing = (liveChrome.writes || []).find((row) => row?.path === path)
            if (writeCardHasDiff(existing)) return true

            const hadDraft = Object.prototype.hasOwnProperty.call(draftBuffersRef.current, path)
            const hadVfs = Object.prototype.hasOwnProperty.call(vfsContentsRef.current, path)
            const before = hadDraft
                ? String(draftBuffersRef.current[path] ?? '')
                : String(vfsContentsRef.current[path] ?? '')
            if (! Object.prototype.hasOwnProperty.call(preStreamBodies, path)) {
                preStreamBodies[path] = (hadDraft || hadVfs) ? before : null
            }
            const rows = before !== after ? buildDiffRows(before, after) : []
            if (! rows.length) return false

            const healActive = Boolean(liveChrome.vfsHeal)
            const card = {
                path,
                status: 'done',
                rows,
                postHeal: healActive,
            }
            const writes = upsertChromeCard(liveChrome.writes, card, { key: 'path' })
            const samePath = liveChrome.editFile?.path === path
            const edits = samePath
                ? (liveChrome.edits || []).filter((row) => row?.path !== path)
                : liveChrome.edits
            let toolStack = upsertToolStack(liveChrome.toolStack, {
                kind: 'writeFile',
                matchKey: path,
                ...card,
            })
            if (samePath) {
                toolStack = toolStack.filter((row) => !(
                    row?.kind === 'editFile' && row.path === path
                ))
            }

            setTurnStatusLabel('')
            flushSync(() => {
                patchTurn({
                    writeFile: card,
                    writes,
                    toolStack,
                    turnStatus: null,
                    editFile: samePath ? null : liveChrome.editFile,
                    edits,
                    ...(healActive ? { writeFilePostHeal: true } : {}),
                })
                applyVfsBatch({ [path]: after }, {
                    persist: false,
                    asDraft: true,
                    triggerPreview: false,
                })
            })
            if (/\.(jsx?|tsx?|mjs|cjs)$/i.test(path)) {
                void import('../lib/labRuntime').then((m) => {
                    m.purgeGuestCustomRouterFiles?.().catch(() => {})
                    m.syncLabVfsToGuest({ [path]: after }, { force: true }).catch(() => {})
                })
            }
            return true
        }

        const paintPendingToolCalls = (calls, { complete = false } = {}) => {
            const pending = pendingChromeFromToolCalls(calls)
            if (! pending.toolStack.length) return false

            if (complete) {
                // Stream said the model finished this call — flip the chip to its final
                // verb now. Drop empty payload arrays so the upsert can't clobber real
                // data written later by the executor's ui events.
                const finalize = (card) => {
                    const next = { ...card, status: 'done' }
                    delete next.rows
                    delete next.items
                    delete next.hits
                    return next
                }
                for (const bucket of ['writes', 'reads', 'listDirs', 'fileSearches', 'greps', 'edits']) {
                    pending[bucket] = pending[bucket].map(finalize)
                }
                pending.toolStack = pending.toolStack.map(finalize)
            }

            const mergeCards = (list, cards, key = 'path') => {
                let next = list
                for (const card of cards) {
                    next = upsertChromeCard(next, card, { key })
                }
                return next
            }

            const writes = pending.writes.length
                ? mergeCards(liveChrome.writes, pending.writes)
                : liveChrome.writes
            const reads = pending.reads.length
                ? mergeCards(liveChrome.reads, pending.reads)
                : liveChrome.reads
            const listDirs = pending.listDirs.length
                ? mergeCards(liveChrome.listDirs, pending.listDirs)
                : liveChrome.listDirs
            const fileSearches = pending.fileSearches.length
                ? mergeCards(liveChrome.fileSearches, pending.fileSearches)
                : liveChrome.fileSearches
            const greps = pending.greps.length
                ? mergeCards(liveChrome.greps, pending.greps)
                : liveChrome.greps
            const edits = pending.edits.length
                ? mergeCards(liveChrome.edits, pending.edits)
                : liveChrome.edits

            let toolStack = liveChrome.toolStack
            for (const entry of pending.toolStack) {
                toolStack = entry?.kind === 'lookupVisuals'
                    ? upsertLookupVisualsStack(toolStack, entry)
                    : upsertToolStack(toolStack, entry)
            }

            setTurnStatusLabel('')
            const applyPatch = () => patchTurn({
                ...(pending.writes.length ? {
                    writes,
                    writeFile: writes[(writes || []).length - 1] || null,
                } : {}),
                ...(pending.reads.length ? {
                    reads,
                    readFile: reads[(reads || []).length - 1] || null,
                } : {}),
                ...(pending.listDirs.length ? {
                    listDirs,
                    listDir: listDirs[(listDirs || []).length - 1] || null,
                } : {}),
                ...(pending.fileSearches.length ? {
                    fileSearches,
                    fileSearch: fileSearches[(fileSearches || []).length - 1] || null,
                } : {}),
                ...(pending.greps.length ? {
                    greps,
                    grep: greps[(greps || []).length - 1] || null,
                } : {}),
                ...(pending.edits.length ? {
                    edits,
                    editFile: edits[(edits || []).length - 1] || null,
                } : {}),
                toolStack,
                turnStatus: null,
            })
            flushSync(applyPatch)

            if ((Array.isArray(calls) ? calls.length : 0) !== 1) {
                return true
            }

            const placeholders = {}
            for (const card of pending.writes) {
                const path = card?.path
                if (! path) continue
                const known = Object.prototype.hasOwnProperty.call(vfsContentsRef.current, path)
                    || Object.prototype.hasOwnProperty.call(draftBuffersRef.current, path)
                if (! known) placeholders[path] = ''
            }
            if (Object.keys(placeholders).length) {
                flushSync(() => {
                    applyVfsBatch(placeholders, {
                        triggerPreview: false,
                        persist: false,
                        asDraft: true,
                    })
                })
            }
            return true
        }

        applyChatStreamEvent = (event) => {
            if (! event || typeof event !== 'object') return
            if (event.type === 'status' && event.label) {
                if (streamThoughtLive || liveChrome.thinking || hasPaintedToolChrome(liveChrome)) {
                    return
                }
                const label = String(event.label)
                if (isModelWaitLabel(label)) streamThoughtStartedAt = 0
                setTurnStatusLabel(label)
                patchTurn({ turnStatus: label })
            }
            if (event.type === 'thought' && event.text) {
                if (! streamThoughtStartedAt) streamThoughtStartedAt = Date.now()
                streamThoughtLive = true
                setTurnStatusLabel('')
                patchTurn({
                    thinking: {
                        status: 'streaming',
                        text: String(event.text),
                        durationSec: 0,
                    },
                    thoughtStartedAt: streamThoughtStartedAt,
                    turnStatus: null,
                })
            }
            if (event.type === 'text' && event.text) {
                if (event.propose_workspace) streamProposedWorkspace = true
                const visible = workspaceOpen
                    ? scrubPseudoToolTags(String(event.text))
                    : presentDiscoveryReply(String(event.text))
                if (! String(visible || '').trim()) return
                // Intro copy landed; the model is still generating write_file JSON.
                // Don't drop back to a blank foot — "Waiting for model" after
                // thought+text is what made the turn look hung.
                const stillWriting = workspaceOpen && ! hasPaintedToolChrome(liveChrome)
                const nextStatus = stillWriting ? 'Writing files…' : null
                setTurnStatusLabel(nextStatus || '')
                patchTurn({
                    bot: visible,
                    turnStatus: nextStatus,
                })
            }
            if (event.type === 'tool_start' && event.name) {
                paintPendingToolCalls([{
                    id: event.id,
                    name: event.name,
                    arguments: event.arguments && typeof event.arguments === 'object'
                        ? event.arguments
                        : {},
                }])
            }
            if (event.type === 'tool_end' && event.name) {
                const args = event.arguments && typeof event.arguments === 'object'
                    ? event.arguments
                    : {}
                if (event.name === 'write_file') {
                    if (! settleWriteFromStream(args)) {
                        // No body yet — keep the Writing chip. complete:true would
                        // flip to "Wrote" with empty rows until the executor runs.
                        return
                    }
                } else {
                    paintPendingToolCalls([{
                        id: event.id,
                        name: event.name,
                        arguments: args,
                    }], { complete: true })
                }
                // Between tool calls the next file body has not started — keep
                // write chrome, not a generic model wait.
                const nextWait = event.name === 'write_file'
                    ? 'Writing files…'
                    : 'Waiting for model…'
                setTurnStatusLabel(nextWait)
                streamThoughtStartedAt = 0
                patchTurn({ turnStatus: nextWait })
            }
        }
        streamReady = true
        while (streamQueue.length) {
            applyChatStreamEvent(streamQueue.shift())
        }

        try {
            if (abortController.signal.aborted) {
                const aborted = new Error('Turn aborted')
                aborted.code = 'ABORTED'
                throw aborted
            }

            const result = await chatPromise
            if (abortController.signal.aborted) {
                const aborted = new Error('Turn aborted')
                aborted.code = 'ABORTED'
                throw aborted
            }
            if (result.model) setModelId(result.model)
            recordSessionUsage(result.project?.uuid || projectUuid, result.usage)
            if (result.credits) publishLabCredits(result.credits)

            const project = result.project
            const uuid = project?.uuid || projectUuid
            persistUuid = uuid || persistUuid
            if (result.assistant_message_id) {
                assistantMessageId = Number(result.assistant_message_id) || null
            }
            // Stamp wait chrome onto the new assistant so F5 keeps the row.
            if (assistantMessageId) {
                void flushChromePersist()
            }
            if (project?.uuid) {
                prevProjectUuidRef.current = project.uuid
                setProjectUuid(project.uuid)
                adoptLabUrl(project.uuid, workspaceOpen, { replace: true })
            }
            if (project?.title) {
                setProjectTitle(project.title)
                setDocumentTitle(project.title)
            }

            let tree = fileTreeRef.current
            let contents = { ...vfsContentsRef.current, ...draftBuffersRef.current }
            if (uuid) {
                const snap = await refreshFileTree(uuid)
                tree = snap.tree
                contents = snap.contents
            }
            // Orchestrator baseline = state BEFORE this turn. Stream-settled
            // drafts are this turn's writes — put the pre-stream bodies back so
            // every streamed file diffs as changed and reaches the disk commit.
            if (Object.keys(preStreamBodies).length) {
                contents = { ...contents }
                for (const [path, body] of Object.entries(preStreamBodies)) {
                    if (body == null) delete contents[path]
                    else contents[path] = body
                }
            }

            const rawContent = result.content || ''
            // Defense in depth: scrub thought tags + any meta that slipped past the API strip.
            const thoughtParsed = stripThoughtBlock(rawContent)
            const scrubbed = stripWorkspaceMeta(thoughtParsed.visible)
            // Strip proactive <todos> before tools / visible reply; plan seeds the Checklist.
            const todoParsed = stripTodos(scrubbed.visible)
            let full = todoParsed.visible
            const thoughtText = String(result.thought || thoughtParsed.thought || '').trim()
            const proposeWorkspace = (
                Boolean(result.propose_workspace)
                || Boolean(scrubbed.propose_workspace)
                || streamProposedWorkspace
            ) && ! workspaceOpen
            // Discovery / clarify must never feed write tools into the executor loop.
            const isExecutorTurn = workspaceOpen && stage === AGENT_STAGES.EXECUTOR
            let toolCalls = isExecutorTurn && Array.isArray(result.tool_calls)
                ? result.tool_calls
                : []
            // Client safety net (server also recovers): text pseudo-tools → native calls.
            const pseudoRecovery = recoverPseudoToolCalls(full, toolCalls, {
                vfsContents: {
                    ...vfsContentsRef.current,
                    ...draftBuffersRef.current,
                },
            })
            if (pseudoRecovery.toolCalls.length) {
                toolCalls = pseudoRecovery.toolCalls
            }
            if (pseudoRecovery.recovered && pseudoRecovery.content !== full) {
                full = stripTodos(pseudoRecovery.content).visible
            }
            const leakedWriteTools = ! isExecutorTurn
                && pseudoRecovery.toolCalls.some((call) => call?.name === 'write_file')
            const effectiveProposeWorkspace = proposeWorkspace || leakedWriteTools
            const explicitLane = forcedLane

            // Model already replied. Wait chrome is only for in-flight HTTP.
            if (isExecutorTurn && toolCalls.length) {
                setTurnStatusLabel('')
                flushSync(() => patchTurn({ turnStatus: null }))
            }

            // Stream thought in parallel with tools so "Writing App.jsx" is not
            // hidden behind the thinking row, then dumped as already-Wrote.
            let thoughtPromise = Promise.resolve()
            if (thoughtText && streamThoughtLive) {
                const durationSec = elapsedSecSince(streamThoughtStartedAt || liveChrome.thoughtStartedAt)
                patchTurn({
                    thinking: {
                        status: 'done',
                        text: thoughtText,
                        durationSec,
                    },
                })
            } else if (thoughtText && ! abortController.signal.aborted) {
                if (! streamThoughtStartedAt) streamThoughtStartedAt = Date.now()
                patchTurn({
                    thinking: { status: 'streaming', text: '', durationSec: 0 },
                    thoughtStartedAt: streamThoughtStartedAt,
                    turnStatus: null,
                })
                thoughtPromise = streamReveal(thoughtText, (partial) => {
                    patchTurn({
                        thinking: {
                            status: 'streaming',
                            text: partial,
                            durationSec: 0,
                        },
                    })
                }, { msPerChar: 6, minMs: 320, maxMs: 900 }).then(() => {
                    const durationSec = elapsedSecSince(streamThoughtStartedAt)
                    patchTurn({
                        thinking: {
                            status: 'done',
                            text: thoughtText,
                            durationSec,
                        },
                    })
                })
            } else if (thoughtText) {
                patchTurn({
                    thinking: {
                        status: 'done',
                        text: thoughtText,
                        durationSec: 0,
                    },
                })
            }
            // Never patchTurn({ thinking: null }) — tool/chrome updates must not clear thought.

            // High-level Checklist from LLM <todos> only — never reactive tool-call micro-logs.
            // Trivial single-file edits omit the block; keep the UI minimal.
            const apiPlan = isExecutorTurn && Array.isArray(result.todos) ? result.todos : []
            let todos = isExecutorTurn
                ? planTodosFromRaw(apiPlan.length ? apiPlan : todoParsed.todos)
                : []
            const syncTodos = (status = 'running') => {
                if (! isExecutorTurn) {
                    patchTurn({ todos: null })
                    return
                }
                patchTurn({
                    todos: todos.length ? { status, items: todos } : null,
                })
            }
            if (todos.length) syncTodos('running')

            const snapshotWriteChrome = (card) => {
                if (! card || typeof card !== 'object') return null
                return {
                    path: card.path || '',
                    status: card.status || 'done',
                    // Clone rows so later writeFile patches cannot wipe the frozen card.
                    rows: Array.isArray(card.rows) ? card.rows.map((row) => ({ ...row })) : [],
                    postHeal: Boolean(card.postHeal),
                }
            }

            const snapshotWrites = (list) => {
                const rows = Array.isArray(list) && list.length
                    ? list
                    : (liveChrome.writeFile ? [liveChrome.writeFile] : [])
                return rows.map((card) => snapshotWriteChrome(card)).filter(Boolean)
            }

            const onHealStart = (event) => {
                const count = Number(event?.detail?.count) || 1
                // Freeze stack position: existing writes stay above; later writes go below.
                setTurnStatusLabel('')
                const already = liveChrome.vfsHeal?.preWrites || null
                const frozen = already?.length
                    ? already
                    : snapshotWrites(liveChrome.writes)
                const toolStack = upsertToolStack(liveChrome.toolStack, {
                    kind: 'vfsHeal',
                    matchKey: 'vfs-heal',
                    count,
                    status: 'active',
                })
                patchTurn({
                    vfsHeal: {
                        count,
                        status: 'active',
                        preWrites: frozen,
                        preWrite: frozen[frozen.length - 1] || null,
                    },
                    toolStack,
                    writeFilePostHeal: Boolean(liveChrome.writeFilePostHeal),
                    turnStatus: null,
                })
            }
            const onHealComplete = (event) => {
                const count = Number(event?.detail?.count)
                    || Number(liveChrome.vfsHeal?.count)
                    || 0
                const toolStack = upsertToolStack(liveChrome.toolStack, {
                    kind: 'vfsHeal',
                    matchKey: 'vfs-heal',
                    count,
                    status: 'done',
                })
                patchTurn({
                    vfsHeal: {
                        ...liveChrome.vfsHeal,
                        count,
                        status: 'done',
                        preWrite: liveChrome.vfsHeal?.preWrite || null,
                        preWrites: liveChrome.vfsHeal?.preWrites || null,
                    },
                    toolStack,
                })
            }
            if (typeof window !== 'undefined') {
                window.addEventListener(VFS_HEAL_START, onHealStart)
                window.addEventListener(VFS_HEAL_COMPLETE, onHealComplete)
            }

            let orch
            try {
                orch = await runOrchestratedTurn({
                // Silent Switch has empty composer text — seed from discovery so
                // the router stays on BUILD (never empty-text → Clarifying).
                text: intentSeed,
                sessionMode,
                explicitLane,
                selectedPath: workspaceViewRef.current?.activePath || null,
                hasAttachments: packed.length > 0,
                workspaceOpen,
                tree,
                canonicalContents: contents,
                messages,
                projectTitle,
                projectUuid: uuid,
                assistantText: full,
                toolCalls,
                finishReason: result.finish_reason || result.stop_reason || null,
                abortSignal: abortController.signal,
                skipScaffoldGate: workspaceOpen,
                allowLegacyHeuristic: false,
                continueAgent: isExecutorTurn
                    ? async ({
                        observations,
                        toolCalls: priorCalls,
                        round,
                        forceTools = false,
                        mandateWriteFile = false,
                        exploreOnly = false,
                        autoContinue = false,
                        pageIncomplete = false,
                        finishReason = null,
                        incompletePaths = [],
                        statusLabel = null,
                    }) => {
                        const needWrites = Boolean(forceTools)
                            || Boolean(mandateWriteFile)
                            || Boolean(exploreOnly)
                            || Boolean(autoContinue)
                            || ! (priorCalls || []).length
                            || ! toolBatchHasWrite(priorCalls)
                        // After explore / empty batch / patch miss / max_tokens: hard-force write_file.
                        const forceWriteFile = Boolean(mandateWriteFile)
                            || Boolean(exploreOnly)
                            || Boolean(autoContinue)
                        // Auto-continue is invisible to the user — it paints as a normal
                        // model wait, never as "auto-continuing…" (reads like an error).
                        const label = statusLabel
                            || (needWrites ? 'Writing files…' : 'Waiting for model…')
                        streamThoughtStartedAt = 0
                        setTurnStatusLabel(label)
                        patchTurn({ turnStatus: label })
                        const continuation = buildAgentContinuationPrompt({
                            observations,
                            toolCalls: priorCalls,
                            round,
                            forceTools: needWrites,
                            mandateWriteFile: forceWriteFile,
                            exploreOnly: exploreOnly && ! autoContinue,
                            autoContinue,
                            pageIncomplete,
                            finishReason,
                            incompletePaths,
                        })
                        const loopMessages = [
                            ...messages,
                            {
                                role: 'assistant',
                                content: (full || '').trim()
                                    || 'Inspected the workspace and gathered context.',
                            },
                            { role: 'user', content: continuation },
                        ]
                        const next = await sendLabChat({
                            model: modelId || undefined,
                            project: uuid || undefined,
                            messages: loopMessages,
                            stage: AGENT_STAGES.EXECUTOR,
                            // Explore-only / patch-miss / empty batch / auto-continue: force write_file only.
                            ...(forceWriteFile
                                ? {
                                    tool_choice: {
                                        type: 'function',
                                        function: { name: 'write_file' },
                                    },
                                }
                                : {}),
                            context_pack: {
                                ...contextPack,
                                pack: {
                                    ...(contextPack?.pack || {}),
                                    safetyFlags: {
                                        ...(contextPack?.pack?.safetyFlags || {}),
                                        // Continuations must not re-issue SILENT BUILD START (full-site rewrite).
                                        silentBuild: false,
                                        forceTools: true,
                                        ...(forceWriteFile ? { forceWriteFile: true } : {}),
                                        ...(autoContinue ? { autoContinue: true } : {}),
                                    },
                                },
                            },
                            persist_user: false,
                            persist_assistant: false,
                        }, { signal: abortController.signal, onEvent: onChatStreamEvent })
                        if (next?.model) setModelId(next.model)
                        recordSessionUsage(uuid || projectUuid, next?.usage)
                        if (next?.credits) publishLabCredits(next.credits)
                        const nextRaw = next?.content || ''
                        const nextThought = stripThoughtBlock(nextRaw)
                        const nextScrubbed = stripWorkspaceMeta(nextThought.visible).visible
                        const nextTodoParsed = stripTodos(nextScrubbed)
                        let nextVisible = nextTodoParsed.visible
                        let nextCalls = Array.isArray(next?.tool_calls) ? next.tool_calls : []
                        if (! nextCalls.length) {
                            const recovered = recoverPseudoToolCalls(nextVisible, [], {
                                vfsContents: {
                                    ...vfsContentsRef.current,
                                    ...draftBuffersRef.current,
                                },
                            })
                            if (recovered.toolCalls.length) {
                                nextCalls = recovered.toolCalls
                            }
                            if (recovered.recovered && recovered.content) {
                                nextVisible = stripTodos(recovered.content).visible
                            }
                        }
                        // Only grow Checklist from additional high-level <todos>, never from tool kinds.
                        const nextApiPlan = Array.isArray(next?.todos) ? next.todos : []
                        const extraPlan = nextApiPlan.length ? nextApiPlan : nextTodoParsed.todos
                        if (extraPlan.length) {
                            todos = mergePlanTodos(todos, extraPlan)
                            syncTodos('running')
                        }
                        if (nextCalls.length) {
                            setTurnStatusLabel('')
                            flushSync(() => patchTurn({ turnStatus: null }))
                        }
                        return {
                            toolCalls: nextCalls,
                            content: nextVisible || '',
                            finishReason: next?.finish_reason || next?.stop_reason || null,
                        }
                    }
                    : null,
                persistDisk: uuid
                    ? async (filesMap) => {
                        await commitFilesAtomic(uuid, filesMap)
                    }
                    : null,
                revertDisk: uuid
                    ? async (snapshot) => {
                        const restore = {}
                        for (const [path, body] of Object.entries(snapshot || {})) {
                            if (body == null) continue
                            restore[path] = body
                        }
                        if (Object.keys(restore).length) {
                            await commitFilesAtomic(uuid, restore)
                        }
                    }
                    : null,
                promoteToCanonical: async (filesMap) => {
                    flushSync(() => {
                        applyVfsBatch(filesMap, {
                            triggerPreview: false,
                            persist: false,
                            asDraft: true,
                        })
                    })
                },
                onState: ({ label, meta }) => {
                    if (meta?.topologyDrain) {
                        const count = Number(meta.unresolvedCount)
                            || (Array.isArray(meta.missing) ? meta.missing.length : 0)
                            || 1
                        // Heal paints as an inline tool row — never as bottom turnStatus.
                        setTurnStatusLabel('')
                        const priorPre = liveChrome.vfsHeal?.preWrites || null
                        const frozen = priorPre?.length
                            ? priorPre
                            : snapshotWrites(liveChrome.writes)
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'vfsHeal',
                            matchKey: 'vfs-heal',
                            count,
                            status: 'active',
                        })
                        patchTurn({
                            vfsHeal: {
                                count,
                                status: 'active',
                                preWrites: frozen,
                                preWrite: frozen[frozen.length - 1] || null,
                            },
                            toolStack,
                            writeFilePostHeal: Boolean(liveChrome.writeFilePostHeal),
                            turnStatus: null,
                        })
                        return
                    }
                    if (label) {
                        const keepWaitVisible = /waiting for model|thinking|starting build|writing files|repairing|planning next move/i.test(label)
                        if (keepWaitVisible) {
                            setTurnStatusLabel(label)
                            patchTurn({ turnStatus: label })
                            return
                        }
                        // Applying / validating — the live tool card is the status.
                        if (hasPaintedToolChrome(liveChrome)) {
                            setTurnStatusLabel('')
                            patchTurn({ turnStatus: null })
                            return
                        }
                        setTurnStatusLabel(label)
                        patchTurn({ turnStatus: label })
                    }
                },
                onUi: (evt) => {
                    if (evt.pendingToolCalls) {
                        // One-at-a-time only. A full batch dump is how "Wrote" cards appear at once.
                        const calls = Array.isArray(evt.pendingToolCalls) ? evt.pendingToolCalls : []
                        if (calls.length === 1) {
                            paintPendingToolCalls(calls)
                        } else if (calls.length) {
                            setTurnStatusLabel('')
                            flushSync(() => patchTurn({ turnStatus: null }))
                        }
                    }
                    if (evt.type === 'tool_start') {
                        if (todos.length) {
                            const path = evt.path || evt.arguments?.path || null
                            todos = advanceTodosOnToolStart(todos, {
                                tool: evt.tool,
                                path,
                            })
                            syncTodos('running')
                        }
                        paintPendingToolCalls([{
                            name: evt.tool,
                            arguments: {
                                ...(evt.arguments && typeof evt.arguments === 'object' ? evt.arguments : {}),
                                ...(evt.path ? { path: evt.path } : {}),
                            },
                        }])
                        return
                    }
                    if (evt.type === 'tool_done') {
                        if (todos.length) {
                            const path = evt.observation?.artifacts?.path || evt.path || null
                            todos = advanceTodosOnToolDone(todos, {
                                tool: evt.tool,
                                path,
                                ok: observationSucceeded(evt.observation),
                            })
                            syncTodos('running')
                        }
                        return
                    }
                    if (evt.callout) {
                        const tone = evt.callout.tone || 'info'
                        if (tone !== 'danger' && tone !== 'warning') return
                        const nextCallouts = [...(liveChrome.callouts || []), evt.callout]
                        patchTurn({ callouts: nextCallouts })
                    }
                    if (evt.listDir) {
                        const card = evt.listDir
                        const listDirs = upsertChromeCard(liveChrome.listDirs, card, { key: 'path' })
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'listDir',
                            matchKey: card.path,
                            ...card,
                        })
                        patchTurn({ listDir: card, listDirs, toolStack })
                    }
                    if (evt.fileSearch) {
                        const card = evt.fileSearch
                        const matchKey = card.query || `search-${(liveChrome.fileSearches || []).length}`
                        const fileSearches = upsertChromeCard(
                            liveChrome.fileSearches,
                            { ...card, path: matchKey },
                            { key: 'path' },
                        )
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'fileSearch',
                            matchKey,
                            ...card,
                        })
                        patchTurn({ fileSearch: card, fileSearches, toolStack })
                    }
                    if (evt.grep) {
                        const card = evt.grep
                        const matchKey = card.pattern || `grep-${(liveChrome.greps || []).length}`
                        const greps = upsertChromeCard(
                            liveChrome.greps,
                            { ...card, path: matchKey },
                            { key: 'path' },
                        )
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'grep',
                            matchKey,
                            ...card,
                        })
                        patchTurn({ grep: card, greps, toolStack })
                    }
                    if (evt.readFile) {
                        const card = evt.readFile
                        const reads = upsertChromeCard(liveChrome.reads, card, { key: 'path' })
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'readFile',
                            matchKey: card.path,
                            ...card,
                        })
                        patchTurn({ readFile: card, reads, toolStack })
                    }
                    if (evt.editFile) {
                        const before = evt.editFile.before || ''
                        const after = evt.editFile.after || ''
                        const ok = evt.editFile.status !== 'error'
                        const wroteSame = turnWrites(liveChrome).some(
                            (row) => row.path === evt.editFile.path,
                        )
                        if (wroteSame) {
                            // Prefer WriteFileCard when the same path was already written.
                        } else {
                            const card = {
                                path: evt.editFile.path,
                                status: ok ? 'done' : 'error',
                                rows: ! ok || before === after
                                    ? []
                                    : buildDiffRows(before, after, { context: 1, collapse: 4 }),
                            }
                            const edits = upsertChromeCard(liveChrome.edits, card, { key: 'path' })
                            const toolStack = upsertToolStack(liveChrome.toolStack, {
                                kind: 'editFile',
                                matchKey: card.path,
                                ...card,
                            })
                            patchTurn({ editFile: card, edits, toolStack })
                        }
                    }
                    if (evt.writeFile) {
                        const before = evt.writeFile.before || ''
                        const after = evt.writeFile.after || ''
                        const healActive = Boolean(liveChrome.vfsHeal)
                        if (evt.writeFile.status === 'writing' && evt.writeFile.path) {
                            const alreadySettled = (liveChrome.writes || []).some((row) => (
                                row?.path === evt.writeFile.path && writeCardHasDiff(row)
                            ))
                            if (alreadySettled) {
                                // Stream already painted Wrote + diff. Don't flash
                                // Writing or clobber rows with an empty placeholder.
                            } else {
                                const card = {
                                    path: evt.writeFile.path,
                                    status: 'writing',
                                    rows: [],
                                    postHeal: healActive,
                                }
                                const writes = upsertChromeCard(liveChrome.writes, card, { key: 'path' })
                                const toolStack = upsertToolStack(liveChrome.toolStack, {
                                    kind: 'writeFile',
                                    matchKey: card.path,
                                    ...card,
                                })
                                setTurnStatusLabel('')
                                flushSync(() => {
                                    patchTurn({
                                        writeFile: card,
                                        writes,
                                        toolStack,
                                        turnStatus: null,
                                        ...(healActive ? { writeFilePostHeal: true } : {}),
                                    })
                                    applyVfsBatch({ [card.path]: after || '' }, {
                                        triggerPreview: false,
                                        persist: false,
                                        asDraft: true,
                                    })
                                })
                            }
                        } else if (evt.writeFile.status === 'error') {
                            // Full reject body → laravel.log; short hint on the card.
                            if (persistUuid) {
                                reportLabEvents(persistUuid, buildWriteFileLogEvent({
                                    path: evt.writeFile.path,
                                    status: 'error',
                                    observation: evt.writeFile.observation,
                                    content: evt.writeFile.content ?? '',
                                    before: evt.writeFile.before || '',
                                    meta: { source: 'toolRuntime' },
                                }))
                            }
                            const card = {
                                path: evt.writeFile.path,
                                status: 'error',
                                rows: [],
                                detail: writeFailureHint(evt.writeFile.observation),
                                postHeal: healActive,
                            }
                            const writes = upsertChromeCard(liveChrome.writes, card, { key: 'path' })
                            const toolStack = upsertToolStack(liveChrome.toolStack, {
                                kind: 'writeFile',
                                matchKey: card.path,
                                ...card,
                            })
                            patchTurn({
                                writeFile: card,
                                writes,
                                toolStack,
                                ...(healActive ? { writeFilePostHeal: true } : {}),
                            })
                        } else if (evt.writeFile.status === 'done' || before !== after) {
                            const card = {
                                path: evt.writeFile.path,
                                status: 'done',
                                rows: before !== after ? buildDiffRows(before, after) : [],
                                postHeal: healActive,
                            }
                            const writes = upsertChromeCard(liveChrome.writes, card, { key: 'path' })
                            const samePath = liveChrome.editFile?.path === evt.writeFile.path
                            const edits = samePath
                                ? (liveChrome.edits || []).filter((row) => row?.path !== evt.writeFile.path)
                                : liveChrome.edits
                            let toolStack = upsertToolStack(liveChrome.toolStack, {
                                kind: 'writeFile',
                                matchKey: card.path,
                                ...card,
                            })
                            if (samePath) {
                                toolStack = toolStack.filter((row) => !(
                                    row?.kind === 'editFile' && row.path === evt.writeFile.path
                                ))
                            }
                            flushSync(() => {
                                patchTurn({
                                    writeFile: card,
                                    writes,
                                    toolStack,
                                    editFile: samePath ? null : liveChrome.editFile,
                                    edits,
                                    ...(healActive ? { writeFilePostHeal: true } : {}),
                                })
                                if (evt.writeFile.path) {
                                    applyVfsBatch({
                                        [evt.writeFile.path]: after || evt.writeFile.content || '',
                                    }, {
                                        triggerPreview: false,
                                        persist: false,
                                        asDraft: true,
                                    })
                                }
                            })
                        }
                    }
                    if (evt.shell) {
                        const card = evt.shell
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'shell',
                            matchKey: card.command || 'shell',
                            ...card,
                        })
                        patchTurn({ shell: card, toolStack, turnStatus: null })
                    }
                    if (evt.fetch) {
                        const card = evt.fetch
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'fetch',
                            matchKey: card.url || 'fetch',
                            ...card,
                        })
                        patchTurn({ fetch: card, toolStack, turnStatus: null })
                    }
                    if (evt.datastoreSurvey) {
                        const card = evt.datastoreSurvey
                        const matchKey = card.matchKey || `survey-${(liveChrome.datastoreSurveys || []).length}`
                        const datastoreSurveys = upsertChromeCard(
                            liveChrome.datastoreSurveys,
                            { ...card, path: matchKey },
                            { key: 'path' },
                        )
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'datastoreSurvey',
                            matchKey,
                            ...card,
                        })
                        // The card is the status now — a lingering wait label
                        // must not keep counting while the user completes OAuth.
                        patchTurn({ datastoreSurvey: card, datastoreSurveys, toolStack, turnStatus: null })
                    }
                    if (evt.datastoreRevision) {
                        const card = evt.datastoreRevision
                        const matchKey = card.matchKey || `revise-${(liveChrome.datastoreRevisions || []).length}`
                        const datastoreRevisions = upsertChromeCard(
                            liveChrome.datastoreRevisions,
                            { ...card, path: matchKey },
                            { key: 'path' },
                        )
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'datastoreRevision',
                            matchKey,
                            ...card,
                        })
                        patchTurn({ datastoreRevision: card, datastoreRevisions, toolStack, turnStatus: null })
                    }
                    if (evt.lookupVisuals) {
                        const card = evt.lookupVisuals
                        const toolStack = upsertLookupVisualsStack(liveChrome.toolStack, card)
                        patchTurn({ lookupVisuals: card, toolStack, turnStatus: null })
                    }
                    if (evt.github) {
                        const card = evt.github
                        const matchKey = card.tool || `github-${(liveChrome.toolStack || []).length}`
                        const toolStack = upsertToolStack(liveChrome.toolStack, {
                            kind: 'github',
                            matchKey,
                            ...card,
                        })
                        patchTurn({ github: card, toolStack, turnStatus: null })
                    }
                    if (evt.aborted) {
                        setTurnStatusLabel('Stopping…')
                        patchTurn({ turnStatus: 'Stopping…' })
                    }
                },
            })
            } finally {
                if (typeof window !== 'undefined') {
                    window.removeEventListener(VFS_HEAL_START, onHealStart)
                    window.removeEventListener(VFS_HEAL_COMPLETE, onHealComplete)
                }
                // Settle the heal card in-thread (never wipe it).
                if (liveChrome.vfsHeal?.status === 'active') {
                    patchTurn({
                        vfsHeal: {
                            ...liveChrome.vfsHeal,
                            status: 'done',
                        },
                    })
                }
            }

            await thoughtPromise

            if ((orch?.rolledBack || orch?.aborted) && uuid) {
                try {
                    await refreshFileTree(uuid)
                } catch {
                    /* disk still holds the last committed tree */
                }
            }

            const writeCommitted = Boolean(
                orch.committed
                && orch.commitResult?.reason === 'committed'
                && (orch.commitResult?.paths?.length || 0) > 0,
            )
            const ranBuildTools = isExecutorTurn
                && orch.lane === LANES.BUILD
                && ! orch.deferredBuild
                && ! orch.clarify
            const paintedTools = hasPaintedToolChrome(liveChrome)

            if ((! isExecutorTurn || ! ranBuildTools) && ! paintedTools) {
                // Discovery / clarify / deferred: never show checklist or tool activity.
                patchTurn({
                    todos: null,
                    listDir: null,
                    listDirs: [],
                    fileSearch: null,
                    fileSearches: [],
                    grep: null,
                    greps: [],
                    readFile: null,
                    reads: [],
                    editFile: null,
                    edits: [],
                    shell: null,
                    fetch: null,
                    writeFile: null,
                    writes: [],
                    toolStack: [],
                })
            } else if (paintedTools && (! isExecutorTurn || ! ranBuildTools)) {
                // Tools already painted — keep cards for F5; do not wipe liveChrome.
            } else if (writeCommitted && todos.length) {
                // On successful commit, every planned high-level todo is complete.
                todos = completeAllTodos(todos)
                syncTodos('done')
            } else if (todos.length) {
                const hasOpen = todos.some((item) => (
                    item.status === 'pending' || item.status === 'active'
                ))
                if (hasOpen) {
                    todos = todos.map((item) => (
                        item.status === 'pending' || item.status === 'active'
                            ? { ...item, status: 'error' }
                            : item
                    ))
                }
                syncTodos('error')
            } else {
                patchTurn({ todos: null })
            }

            // Present model text only — never splice callout copy into the reply (avoids duplicate UI).
            let presentText = full
            // Discovery: never paint fenced code dumps into the chat panel.
            if (! workspaceOpen) {
                presentText = presentDiscoveryReply(presentText)
            }

            const isFollowUp = Boolean(followUpTurnId)
            // Switch reuses discovery: keep the original bot, stream build prose under tools.
            const preserveDiscovery = Boolean(attachTurnId)

            // Strip leaked <suggestions> from visible body; chips stay ephemeral on the turn.
            const suggestionParsed = stripSuggestions(presentText)
            presentText = suggestionParsed.visible
            const apiSuggestions = Array.isArray(result.suggestions) ? result.suggestions : []
            const mergedSuggestions = apiSuggestions.length
                ? apiSuggestions
                : suggestionParsed.suggestions
            const ephemeralSuggestions = (
                ! workspaceOpen
                && ! isFollowUp
                && ! preserveDiscovery
                && ! effectiveProposeWorkspace
            )
                ? mergedSuggestions
                : []

            const failedWrites = (liveChrome.toolStack || []).filter((row) => (
                row?.kind === 'writeFile' && row?.status === 'error' && row?.path
            ))

            const recapNeeded = isExecutorTurn
                && writeCommitted
                && ! orch.aborted
                && failedWrites.length === 0
                && needsTurnRecap(presentText)

            if (recapNeeded && ! abortController.signal.aborted) {
                setTurnStatusLabel('Summarizing…')
                patchTurn({ turnStatus: 'Summarizing…' })
                try {
                    const recap = await requestTurnRecap({
                        sendLabChat,
                        modelId,
                        projectUuid: uuid || persistUuid,
                        messages,
                        userText: intentSeed,
                        paths: orch.commitResult?.paths || [],
                        todos,
                        signal: abortController.signal,
                    })
                    if (recap?.model) setModelId(recap.model)
                    recordSessionUsage(uuid || projectUuid, recap?.usage)
                    if (recap?.credits) publishLabCredits(recap.credits)
                    if (String(recap?.text || '').trim()) {
                        presentText = recap.text
                    }
                } catch (recapError) {
                    if (abortController.signal.aborted) throw recapError
                    if (isEntitlementDenied(recapError)) {
                        publishCreditsExhausted(recapError?.payload || recapError)
                        if (recapError?.payload?.entitlement) {
                            publishLabCredits({
                                used: recapError.payload.entitlement.used,
                                limit: recapError.payload.entitlement.limit,
                                remaining: recapError.payload.entitlement.remaining,
                                unlimited: recapError.payload.entitlement.unlimited,
                                upgradeUrl: recapError.payload.entitlement.upgrade_url,
                            })
                        }
                    }
                    presentText = fallbackTurnRecap(intentSeed, orch.commitResult?.paths || [])
                } finally {
                    setTurnStatusLabel('')
                    patchTurn({ turnStatus: null })
                }
            }

            const streamUnder = isFollowUp || preserveDiscovery
            const alreadyStreamed = Boolean(String(liveChrome.bot || '').trim()) && ! streamUnder
            // Stop must clear "Stopping…" immediately — don't wait on a faux stream.
            // Live SSE already painted the reply — don't re-typewriter it.
            const reveal = orch.aborted
                ? { visible: stripWorkspaceMeta(presentText).visible }
                : alreadyStreamed
                    ? {
                        visible: stripWorkspaceMeta(presentText).visible,
                        propose_workspace: streamProposedWorkspace,
                    }
                    : await streamReveal(presentText, (partial) => {
                        if (streamUnder) {
                            // Don't wipe the optimistic Skip seed with empty frames.
                            if (isFollowUp && ! String(partial || '').trim()) return
                            patchTurn({ botFollowUp: partial })
                        } else {
                            patchTurn({ bot: partial, buildGate: null })
                        }
                    }, { msPerChar: 12, minMs: 600, maxMs: 2200 })

            const safeBot = reveal?.visible ?? stripWorkspaceMeta(presentText).visible
            const displayBot = workspaceOpen
                ? sanitizeBuildReply(safeBot, { failedWrites })
                : presentDiscoveryReply(safeBot)
            // Callouts: only real operational failures (warning/danger) — never soft “need detail” info.
            const errorCallouts = (orch.callouts || []).filter((c) => (
                c?.text && (c.tone === 'danger' || c.tone === 'warning')
            ))
            const validationFailure = orch.validationFailure || (
                orch.rolledBack && orch.validation
                    ? {
                        errorClass: orch.validation.errorClass || orch.validation.outcome || 'VALIDATION_FAILED',
                        outcome: orch.validation.outcome || null,
                        errors: Array.isArray(orch.validation.errors)
                            ? orch.validation.errors.map((row) => String(row || '')).filter(Boolean).slice(0, 12)
                            : [],
                    }
                    : null
            )
            // BuildGate ONLY when the model emitted propose_workspace (AI readiness).
            // Skip/reject never re-arms the card on the rejection follow-up turn.
            const showGate = (
                effectiveProposeWorkspace
                || Boolean(reveal?.propose_workspace)
                || streamProposedWorkspace
                || discoveryReadyForBuild(displayBot)
            ) && ! workspaceOpen && ! orch.aborted && ! gateDismissed && ! isFollowUp && ! preserveDiscovery
            if (isFollowUp) {
                const followUpText = String(displayBot || '').trim()
                patchTurn({
                    // Empty model reply keeps the optimistic Skip seed.
                    ...(followUpText ? { botFollowUp: followUpText } : {}),
                    buildGate: 'skipped',
                    skipDivider: true,
                    callouts: errorCallouts.length ? errorCallouts : null,
                    validationFailure,
                    turnStatus: null,
                    suggestions: null,
                })
            } else if (preserveDiscovery) {
                patchTurn({
                    botFollowUp: displayBot,
                    buildGate: 'accepted',
                    callouts: errorCallouts.length ? errorCallouts : null,
                    validationFailure,
                    turnStatus: null,
                    suggestions: null,
                })
            } else {
                patchTurn({
                    bot: displayBot,
                    buildGate: showGate ? 'pending' : null,
                    callouts: errorCallouts.length ? errorCallouts : null,
                    validationFailure,
                    turnStatus: null,
                    // In-memory only — never written to turn chrome / DB metadata.
                    suggestions: showGate || ephemeralSuggestions.length === 0
                        ? null
                        : ephemeralSuggestions,
                })
            }

            // Persist thinking + tool cards onto the assistant row (Switch stub when attached).
            await persistSettledChrome({
                content: isFollowUp ? undefined : (String(presentText || '').trim() || displayBot || ''),
                failed: Boolean(orch.rolledBack || orch.softFail || validationFailure),
            })

            const streamTail = endAiStream()
            if (! orch.rolledBack && ! orch.aborted) {
                void import('../lib/labRuntime').then(async (m) => {
                    let contents = {
                        ...vfsContentsRef.current,
                        ...draftBuffersRef.current,
                    }
                    const stubHeal = await import('../lib/componentStub.js').then((mod) => mod.healComponentStubs(contents))
                    if (stubHeal.healed.length) {
                        contents = { ...contents, ...stubHeal.patch }
                        applyVfsBatch(stubHeal.patch, {
                            triggerPreview: false,
                            persist: true,
                        })
                    }
                    // Persist wrong-relative ui/* import rewrites (`./ui/button`
                    // from a page) so editor + disk match what the guest runs.
                    const [{ healUiImports }, { CANONICAL_BUTTON }] = await Promise.all([
                        import('../lib/healUiImports.js'),
                        import('../lib/normalizeGuestUiKit.js'),
                    ])
                    const importHeal = healUiImports(contents, [], { canonicalButton: CANONICAL_BUTTON })
                    if (importHeal.changed) {
                        contents = importHeal.files
                        applyVfsBatch(importHeal.patch, {
                            triggerPreview: false,
                            persist: true,
                        })
                    }
                    const wrotePaths = Array.isArray(orch.commitResult?.paths)
                        ? orch.commitResult.paths.filter(Boolean)
                        : []
                    if (! wrotePaths.length && ! streamTail?.reload) {
                        await m.syncLabVfsToGuest(contents)
                        return
                    }
                    // Ordered commit: sync + force-refresh touched modules,
                    // retouch CSS last (Tailwind regenerates seeing every new
                    // file), then remount once Vite settles — the user must
                    // never need a manual refresh, and the remounted page must
                    // never load a stylesheet older than this turn's files.
                    await m.commitLabAiChanges({
                        contents,
                        touchedPaths: wrotePaths,
                        reason: autoRepair ? 'auto-repair' : 'ai-commit',
                    })
                }).catch(() => {})
            }
        } catch (error) {
            if (chromePersistTimer) {
                clearTimeout(chromePersistTimer)
                chromePersistTimer = null
            }
            cancelAiStream()
            const restoreUuid = persistUuid || projectUuid
            if (restoreUuid) {
                try {
                    await refreshFileTree(restoreUuid)
                } catch {
                    /* ignore */
                }
            }
            const isAbort = error?.code === 'ABORTED'
                || error?.name === 'AbortError'
                || abortController.signal.aborted
            if (isAbort) {
                setTurns((list) => list.map((t) => (
                    t.id === id ? { ...t, turnStatus: null } : t
                )))
            } else if (isEntitlementDenied(error)) {
                publishCreditsExhausted(error?.payload || error)
                if (error?.payload?.entitlement) {
                    publishLabCredits({
                        used: error.payload.entitlement.used,
                        limit: error.payload.entitlement.limit,
                        remaining: error.payload.entitlement.remaining,
                        unlimited: error.payload.entitlement.unlimited,
                        upgradeUrl: error.payload.entitlement.upgrade_url,
                    })
                }
                const message = error?.message || 'You have used all Lab credits on your pack this month.'
                const errText = message
                const isFollowUp = Boolean(followUpTurnId)
                const preserveDiscovery = Boolean(attachTurnId)
                await streamReveal(errText, (partial) => {
                    setTurns((list) => list.map((t) => (t.id === id ? {
                        ...t,
                        ...(isFollowUp
                            ? { botFollowUp: partial, buildGate: 'skipped', skipDivider: true }
                            : preserveDiscovery
                                ? { botFollowUp: partial, buildGate: 'accepted' }
                                : { bot: partial, buildGate: null }),
                    } : t)))
                })
                setTurns((list) => list.map((t) => (t.id === id ? {
                    ...t,
                    turnStatus: null,
                    ...(isFollowUp
                        ? { botFollowUp: errText, buildGate: 'skipped', skipDivider: true }
                        : preserveDiscovery
                            ? { botFollowUp: errText, buildGate: 'accepted' }
                            : { bot: errText, buildGate: null }),
                } : t)))
                liveChrome.bot = isFollowUp || preserveDiscovery ? liveChrome.bot : errText
                liveChrome.botFollowUp = isFollowUp || preserveDiscovery ? errText : liveChrome.botFollowUp
                await persistSettledChrome({
                    content: isFollowUp ? undefined : errText,
                    failed: true,
                })
            } else {
                const message = error?.message || 'Something went wrong talking to the model.'
                const hint = /API key|provider \[|Could not reach provider|Network error|CURLOPT_PROXY/i.test(message)
                    ? ''
                    : '\n\nIf this persists, check provider keys in Dashboard → AI settings (or `.env`) and that Lab is open on the Laravel URL (`:8000`).'
                const errText = `I couldn’t reach the model.\n\n${message}${hint}`
                const isFollowUp = Boolean(followUpTurnId)
                const preserveDiscovery = Boolean(attachTurnId)
                await streamReveal(errText, (partial) => {
                    setTurns((list) => list.map((t) => (t.id === id ? {
                        ...t,
                        ...(isFollowUp
                            ? { botFollowUp: partial, buildGate: 'skipped', skipDivider: true }
                            : preserveDiscovery
                                ? { botFollowUp: partial, buildGate: 'accepted' }
                                : { bot: partial, buildGate: null }),
                    } : t)))
                })
                setTurns((list) => list.map((t) => (t.id === id ? {
                    ...t,
                    turnStatus: null,
                    ...(isFollowUp
                        ? { botFollowUp: errText, buildGate: 'skipped', skipDivider: true }
                        : preserveDiscovery
                            ? { botFollowUp: errText, buildGate: 'accepted' }
                            : { bot: errText, buildGate: null }),
                } : t)))
                await persistSettledChrome({
                    content: isFollowUp ? undefined : errText,
                    failed: true,
                })
            }
        } finally {
            if (chromePersistTimer) {
                clearTimeout(chromePersistTimer)
                chromePersistTimer = null
            }
            turnAbortRef.current = null
            setTurnStatusLabel('')
            setTurns((list) => list.map((t) => (
                t.id === id && t.turnStatus ? { ...t, turnStatus: null } : t
            )))
            try {
                await persistSettledChrome()
            } catch {
                /* ignore */
            }
            if (isAiStreamingRef.current) cancelAiStream()
            setBusy(false)
            if (! abortController.signal.aborted) {
                playDeskChime()
            }
        }
    }, [
        busy,
        building,
        projectUuid,
        projectTitle,
        modelId,
        turns,
        refreshFileTree,
        beginAiStream,
        applyVfsBatch,
        endAiStream,
        cancelAiStream,
        beginShelf,
        shelfReady,
        effectiveSessionMode,
        clearSuggestions,
        editTargets,
    ])

    sendRef.current = send

    const pickSuggestion = useCallback((label) => {
        const text = String(label || '').trim()
        if (! text || busy) return
        clearSuggestions()
        send({ content: text, attachments: [] })
    }, [busy, clearSuggestions, send])

    return {
        turns,
        setTurns,
        draft,
        setDraft,
        files,
        editTargets,
        busy,
        setAnchorId,
        modelId,
        models,
        turnStatusLabel,
        live,
        latestTurn,
        send,
        pickSuggestion,
        stopTurn,
        sendRef,
        addFiles,
        removeFile,
        addEditTarget,
        removeEditTarget,
        // shelf
        shelfTurnId,
        shelfMinHeight,
        beginShelf,
        shelfReady,
        showFollowButton,
        resumeFollow,
    }
}
