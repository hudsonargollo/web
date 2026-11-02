import {
    ERROR_CLASSES,
    LANES,
    MAX_AUTONOMOUS_TURNS,
    MAX_EMPTY_BATCH_REPROMPTS,
    MAX_EXPLORE_TOOLS_PER_TURN,
    MAX_IDENTICAL_REJECT_CONTINUES,
    MAX_REPAIR_ROUNDS,
    MAX_SYSTEM_FIX_RETRIES,
    MAX_TOPOLOGY_DRAIN_ROUNDS,
    SESSION_MODES,
    STATUS_LABELS,
    TURN_STATES,
    VALIDATOR_OUTCOMES,
    WRITE_MODES,
} from './constants.js'
import { classifyIntent } from './intentRouter.js'
import { packContext, buildSessionStub } from './contextPack.js'
import { createTurnMachine } from './turnMachine.js'
import { createWorkingVfs } from './workingVfs.js'
import { createPatchGate } from './patchGate.js'
import {
    createErrorFingerprintTracker,
    validateWorkingTree,
} from './validator.js'
import { atomicCommit, rollbackWorking, snapshotPaths } from './commitBarrier.js'
import { runExecutorPass } from './executor.js'
import { recoverPseudoToolCalls } from './pseudoToolCalls.js'
import {
    AUTO_CONTINUE_SYSTEM_ERROR,
    EMPTY_WRITE_SYSTEM_ERROR,
    EXPLORE_ONLY_SYSTEM_ERROR,
    FORCE_WRITE_FILE_SYSTEM_ERROR,
    TOPOLOGY_MISSING_SYSTEM_ERROR,
    WRITE_REJECT_SYSTEM_ERROR,
    autonomousContinueLabel,
    countExploreTools,
    emptyWritePathsFromToolCalls,
    failedWritePathsFromObservations,
    isMaxTokensFinishReason,
    isPageAssemblyIncomplete,
    isMultiPageRoutingIncomplete,
    needsAutonomousContinue,
    PAGE_INCOMPLETE_SYSTEM_ERROR,
    MULTI_PAGE_INCOMPLETE_SYSTEM_ERROR,
    normalizeFinishReason,
    rejectPathKey,
    toolBatchHasWrite,
    toolBatchHasWriteFile,
    truncateExploreToolBatch,
} from './agentLoop.js'
import {
    applyMissingImportStubs,
    buildSystemFixPrompt,
    ensureBarePackagesInPackageJson,
    pushHealCallout,
    VFS_STUB_MARKER,
} from './vfsHeal.js'
import {
    analyzeWorkingVfsTopology,
    applyTopologyStubFallback,
    buildTopologyDrainBrief,
    pushTopologyDrainCallout,
    topologyNeedsDrain,
} from './dependencyDag.js'
import {
    publishVfsHealComplete,
    publishVfsHealLog,
    publishVfsHealStart,
    vfsHealResolvingLabel,
} from './vfsHealSignal.js'
import { syncPatchEngineBuffers } from './patchApply.js'
import { probePendingSources } from './syntaxProbe.js'

/**
 * Top-level turn runner: Ingress → Router → Lane → (Build pipeline) → Present.
 *
 * @param {{
 *   text: string,
 *   sessionMode?: string,
 *   explicitLane?: string|null,
 *   selectedPath?: string|null,
 *   hasAttachments?: boolean,
 *   workspaceOpen?: boolean,
 *   tree?: array,
 *   canonicalContents?: Record<string, string>,
 *   messages?: array,
 *   projectTitle?: string|null,
 *   projectUuid?: string|null,
 *   assistantText?: string,
 *   toolCalls?: array|null,
 *   finishReason?: string|null,
 *   promoteToCanonical: (files: Record<string, string>) => Promise<void>|void,
 *   onState?: (payload: object) => void,
 *   onUi?: (payload: object) => void,
 *   abortSignal?: AbortSignal|null,
 *   skipScaffoldGate?: boolean,
 *   allowLegacyHeuristic?: boolean,
 *   continueAgent?: (payload: {
 *     observations: array,
 *     toolCalls: array,
 *     round: number,
 *     forceTools?: boolean,
 *     mandateWriteFile?: boolean,
 *     exploreOnly?: boolean,
 *     autoContinue?: boolean,
 *     finishReason?: string|null,
 *     incompletePaths?: string[],
 *     statusLabel?: string|null,
 *   }) => Promise<{ toolCalls?: array, content?: string, finishReason?: string|null }|null>,
 * }} options
 */
export async function runOrchestratedTurn(options = {}) {
    const {
        text = '',
        sessionMode = SESSION_MODES.PLANNING,
        explicitLane = null,
        selectedPath = null,
        hasAttachments = false,
        workspaceOpen = false,
        tree = [],
        canonicalContents = {},
        messages = [],
        projectTitle = null,
        projectUuid = null,
        assistantText = '',
        toolCalls = null,
        finishReason: initialFinishReason = null,
        promoteToCanonical,
        persistDisk = null,
        revertDisk = null,
        onState = null,
        onUi = null,
        abortSignal = null,
        skipScaffoldGate = false,
        allowLegacyHeuristic = false,
        continueAgent = null,
    } = options

    const machine = createTurnMachine({
        onTransition: ({ from, to, meta, aborted }) => {
            onState?.({
                state: to,
                from,
                label: STATUS_LABELS[to] || '',
                aborted,
                meta,
            })
        },
    })

    const warnings = []
    const callouts = []
    let workingVfs = null
    let intent = null
    let commitResult = null
    let contextPack = null
    let lastValidation = null
    /** Terminal + chat badge bridge — true once dependency heal starts this turn. */
    let healBridgeActive = false
    let healBridgeCount = 0

    const beginHealBridge = (analysisOrCount, reason = 'topology') => {
        const missing = Array.isArray(analysisOrCount?.missing)
            ? analysisOrCount.missing
            : Array.isArray(analysisOrCount)
                ? analysisOrCount
                : []
        const fromAnalysis = (analysisOrCount?.missing?.length || 0)
            + (analysisOrCount?.unresolvedSymbols?.length || 0)
        const count = typeof analysisOrCount === 'number'
            ? Math.max(1, analysisOrCount)
            : (fromAnalysis || missing.length || 1)
        healBridgeCount = Math.max(healBridgeCount, count)
        if (! healBridgeActive) {
            healBridgeActive = true
            publishVfsHealStart({
                count: healBridgeCount,
                missing,
                reason,
            })
            // Scan phase once per heal cycle — publishVfsHealLog also dedupes.
            publishVfsHealLog({
                command: 'resolving-modules',
                missing,
                lines: [
                    vfsHealResolvingLabel(healBridgeCount),
                    ...missing.slice(0, 16).map((path) => `  → ${path}`),
                ],
            })
        }
        // Unchanged missing set: do not re-emit resolving-modules (loop lock).
        return healBridgeCount
    }

    const finishHealBridge = (ok = true) => {
        if (! healBridgeActive) return
        healBridgeActive = false
        publishVfsHealComplete({
            ok: Boolean(ok),
            count: healBridgeCount,
            lines: ok
                ? ['✓ Modules resolved — compile succeeded']
                : ['✗ Module resolution finished without a clean compile'],
        })
    }

    const wireAbort = () => {
        if (! abortSignal) return
        const onAbort = () => {
            machine.requestAbort('user_stop')
            workingVfs?.discard?.()
            onUi?.({ aborted: true })
        }
        if (abortSignal.aborted) onAbort()
        else abortSignal.addEventListener('abort', onAbort, { once: true })
    }

    try {
        machine.transition(TURN_STATES.RECEIVED)
        wireAbort()
        machine.assertNotAborted()

        machine.transition(TURN_STATES.ROUTING)
        intent = classifyIntent({
            text,
            sessionMode,
            explicitLane,
            selectedPath,
            hasAttachments,
            workspaceOpen,
        })

        onUi?.({ intent })

        const sessionStub = buildSessionStub({
            sessionMode: intent.sessionAffinity,
            projectTitle,
            activePath: selectedPath,
        })

        contextPack = packContext({
            lane: intent.lane,
            sessionStub,
            tree,
            contents: canonicalContents,
            messages,
            hotPaths: selectedPath ? [selectedPath] : [],
            safetyFlags: {},
        })

        if (intent.lane === LANES.CHAT) {
            machine.transition(TURN_STATES.CHAT_RESPONDING)
            machine.assertNotAborted()
            machine.transition(TURN_STATES.PRESENTING, { lane: LANES.CHAT })
            machine.transition(TURN_STATES.IDLE)
            return presentResult({
                ok: true,
                lane: LANES.CHAT,
                intent,
                warnings,
                callouts,
                commitResult: null,
                contextPack,
                // BuildGate is AI-driven via propose_workspace — never UI heuristics.
                needsBuildGate: false,
            })
        }

        if (intent.lane === LANES.CLARIFY) {
            machine.transition(TURN_STATES.CLARIFYING)
            machine.assertNotAborted()
            // No hardcoded “need more detail” callouts — the model reply is the only prompt.
            machine.transition(TURN_STATES.PRESENTING, { lane: LANES.CLARIFY })
            machine.transition(TURN_STATES.IDLE)
            return presentResult({
                ok: true,
                lane: LANES.CLARIFY,
                intent,
                warnings,
                callouts,
                commitResult: null,
                contextPack,
                clarify: true,
                needsBuildGate: false,
            })
        }

        // —— Build lane ——
        machine.transition(TURN_STATES.PLANNING)
        machine.assertNotAborted()

        // Without an open workspace, discovery must never mutate VFS — even if the
        // model leaked tool_calls. Wait for propose_workspace / Switch.
        if (! skipScaffoldGate && ! workspaceOpen) {
            machine.transition(TURN_STATES.AWAITING_APPROVAL)
            machine.transition(TURN_STATES.PRESENTING, { awaitingApproval: true })
            machine.transition(TURN_STATES.IDLE)
            return presentResult({
                ok: true,
                lane: LANES.BUILD,
                intent,
                warnings,
                callouts,
                commitResult: null,
                contextPack,
                needsBuildGate: false,
                deferredBuild: true,
            })
        }

        workingVfs = createWorkingVfs(canonicalContents)
        const fingerprints = createErrorFingerprintTracker()
        const patchGate = createPatchGate()
        let forceFullWrite = intent.writeModeHint === WRITE_MODES.FULL
        let repairBrief = null
        let repairRounds = 0
        let systemFixAttempts = 0
        /** @type {string[]} */
        let healStubPaths = []
        // Prefer provider-native tool_calls; recover text/JSON/diff pseudo-tools as a safety net.
        let currentToolCalls = Array.isArray(toolCalls) ? toolCalls : []
        if (! currentToolCalls.length && assistantText) {
            const recovered = recoverPseudoToolCalls(assistantText, [], {
                vfsContents: canonicalContents,
            })
            if (recovered.toolCalls.length) {
                currentToolCalls = recovered.toolCalls
            }
        }
        let agentRound = 0
        /** Continuations (continueAgent) used this turn — capped by MAX_AUTONOMOUS_TURNS. */
        let agentContinuations = 0
        let exploreToolsUsed = 0
        let lastFinishReason = normalizeFinishReason(initialFinishReason)
        const isWorkspaceFollowUp = Boolean(workspaceOpen)
            && Object.keys(canonicalContents || {}).length > 0
        let emptyBatchReprompts = 0
        let lastRejectKey = ''
        let rejectStreak = 0
        const canContinueAgent = () => (
            typeof continueAgent === 'function'
            && agentContinuations < MAX_AUTONOMOUS_TURNS
        )

        const forwardToolEvents = (evt) => {
            if (evt.type === 'ui') onUi?.(evt)
            if (evt.type === 'tool_start' || evt.type === 'tool_done') onUi?.(evt)
            if (evt.callout) callouts.push(evt.callout)
        }

        /** Normalize continueAgent tool_calls (+ pseudo recovery). Always drop apply_patch. */
        const takeToolCalls = (payload) => {
            let calls = Array.isArray(payload?.toolCalls)
                ? payload.toolCalls.filter((c) => c?.name)
                : []
            if (! calls.length && payload?.content) {
                const recovered = recoverPseudoToolCalls(payload.content, [], {
                    vfsContents: workingVfs.snapshot(),
                })
                calls = recovered.toolCalls
            }
            return calls.filter((c) => c?.name !== 'apply_patch')
        }

        const rememberFinishReason = (payload) => {
            const next = normalizeFinishReason(payload?.finishReason ?? payload?.finish_reason ?? null)
            if (next) lastFinishReason = next
            return lastFinishReason
        }

        /**
         * Hard write_file re-prompt after explore-only / empty mutation batches.
         * Always forces tool_choice=write_file via mandateWriteFile + exploreOnly.
         */
        const rePromptForWrite = async ({
            observations = [],
            priorCalls = [],
            round,
            label = 'Writing files…',
            meta = {},
        } = {}) => {
            // Transition first — onTransition emits the generic OBSERVING label, so the
            // explicit wait label below must come last to stay visible.
            machine.transition(TURN_STATES.OBSERVING, {
                agentRound: round,
                exploreOnly: true,
                mandateWriteFile: true,
                ...meta,
            })
            onState?.({
                state: TURN_STATES.OBSERVING,
                label,
                meta: {
                    agentRound: round,
                    exploreOnly: true,
                    mandateWriteFile: true,
                    exploreToolsUsed,
                    ...meta,
                },
            })
            const next = await continueAgent({
                observations: [
                    ...observations,
                    {
                        status: 'error',
                        toolKind: 'policy',
                        summary: meta.pageIncomplete
                            ? PAGE_INCOMPLETE_SYSTEM_ERROR
                            : meta.multiPageIncomplete
                                ? MULTI_PAGE_INCOMPLETE_SYSTEM_ERROR
                                : meta.autoContinue
                                ? AUTO_CONTINUE_SYSTEM_ERROR
                                : meta.writeRejectRetry
                                    ? [
                                        WRITE_REJECT_SYSTEM_ERROR,
                                        Array.isArray(meta.rejectedPaths) && meta.rejectedPaths.length
                                            ? `Rejected paths: ${meta.rejectedPaths.join(', ')}`
                                            : '',
                                    ].filter(Boolean).join(' ')
                                    : forceFullWrite
                                        ? FORCE_WRITE_FILE_SYSTEM_ERROR
                                        : EXPLORE_ONLY_SYSTEM_ERROR,
                        artifacts: {
                            exploreToolsUsed,
                            ...(Array.isArray(meta.rejectedPaths) && meta.rejectedPaths.length
                                ? { rejectedPaths: meta.rejectedPaths }
                                : {}),
                            ...(Array.isArray(meta.incompletePaths) && meta.incompletePaths.length
                                ? { incompletePaths: meta.incompletePaths }
                                : {}),
                            finishReason: lastFinishReason || null,
                        },
                    },
                ],
                toolCalls: priorCalls,
                round,
                forceTools: true,
                mandateWriteFile: true,
                exploreOnly: ! forceFullWrite && ! meta.autoContinue,
                autoContinue: Boolean(meta.autoContinue),
                pageIncomplete: Boolean(meta.pageIncomplete),
                finishReason: lastFinishReason,
                incompletePaths: meta.incompletePaths || meta.rejectedPaths || [],
                statusLabel: label,
            })
            rememberFinishReason(next)
            return takeToolCalls(next)
        }

        machine.transition(TURN_STATES.EXECUTING)

        // Phase A — initial tool batch + at most one continueAgent (empty / explore / missing writes).
        // Prose-only / explore-only tool_calls must NOT finish a mutation turn without that single slot.
        // eslint-disable-next-line no-constant-condition
        while (true) {
            machine.assertNotAborted()

            // Bootstrap: silent Switch / autoStart / follow-up often returns intro text with zero tools.
            // Re-prompt with forceTools — this consumes the single continuation slot when initial was empty.
            if (
                intent.mutation
                && currentToolCalls.length === 0
                && canContinueAgent()
            ) {
                onState?.({
                    state: TURN_STATES.OBSERVING,
                    label: 'Writing files…',
                    meta: { agentRound, bootstrap: true },
                })
                machine.transition(TURN_STATES.OBSERVING, { agentRound, bootstrap: true })

                let boot = null
                try {
                    boot = await continueAgent({
                        observations: [{
                            status: 'error',
                            toolKind: 'policy',
                            summary: isWorkspaceFollowUp
                                ? EMPTY_WRITE_SYSTEM_ERROR
                                : 'No tool_calls yet — native write_file required to start the build.',
                            artifacts: {},
                        }],
                        toolCalls: [],
                        round: agentRound + 1,
                        forceTools: true,
                        // Workspace follow-ups: force write_file immediately (no explore loop).
                        mandateWriteFile: isWorkspaceFollowUp,
                        exploreOnly: false,
                        statusLabel: 'Writing files…',
                    })
                    rememberFinishReason(boot)
                    agentContinuations += 1
                } catch (error) {
                    if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                        throw error
                    }
                    callouts.push({
                        tone: 'warning',
                        text: error?.message || 'Agent tool bootstrap failed.',
                    })
                    break
                }
                machine.assertNotAborted()

                currentToolCalls = takeToolCalls(boot)

                if (! currentToolCalls.length) {
                    // Slot spent — do not loop forever on prose-only.
                    break
                }

                machine.transition(TURN_STATES.EXECUTING, { agentRound })
            }

            if (intent.mutation && currentToolCalls.length === 0) {
                break
            }

            // Cap read/explore tools at MAX_EXPLORE_TOOLS_PER_TURN for mutation turns.
            if (intent.mutation) {
                const beforeCap = currentToolCalls
                currentToolCalls = truncateExploreToolBatch(
                    currentToolCalls,
                    exploreToolsUsed,
                    MAX_EXPLORE_TOOLS_PER_TURN,
                )
                const droppedExplores = countExploreTools(beforeCap) - countExploreTools(currentToolCalls)

                // Explore budget exhausted and batch had no writes → hard write_file re-prompt.
                if (
                    droppedExplores > 0
                    && ! toolBatchHasWrite(currentToolCalls)
                    && canContinueAgent()
                ) {
                    try {
                        currentToolCalls = await rePromptForWrite({
                            observations: [],
                            priorCalls: beforeCap,
                            round: agentRound + 1,
                            label: 'Writing files…',
                            meta: { exploreBudgetExceeded: true },
                        })
                        agentContinuations += 1
                        agentRound += 1
                        currentToolCalls = currentToolCalls.filter((c) => c?.name === 'write_file')
                        if (! currentToolCalls.length) {
                            break
                        }
                    } catch (error) {
                        if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                            throw error
                        }
                        callouts.push({
                            tone: 'warning',
                            text: error?.message || 'Explore-budget write re-prompt failed.',
                        })
                        break
                    }
                } else if (! currentToolCalls.length) {
                    if (canContinueAgent()) {
                        try {
                            currentToolCalls = await rePromptForWrite({
                                observations: [],
                                priorCalls: beforeCap,
                                round: agentRound + 1,
                                label: 'Writing files…',
                                meta: { exploreBudgetExceeded: true },
                            })
                            agentContinuations += 1
                            agentRound += 1
                            if (! currentToolCalls.length) break
                            // Fall through to execute.
                        } catch (error) {
                            if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                                throw error
                            }
                            break
                        }
                    } else {
                        break
                    }
                }
            }

            const exploresThisBatch = countExploreTools(currentToolCalls)
            const pass = await runExecutorPass({
                machine,
                workingVfs,
                tree,
                userText: text,
                assistantText,
                toolCalls: currentToolCalls,
                writeMode: intent.writeModeHint,
                forceFullWrite,
                repairBrief: null,
                projectUuid,
                allowLegacyHeuristic: false,
                vfsContents: workingVfs.snapshot(),
                patchGate,
                onEvent: forwardToolEvents,
                abortSignal,
            })

            // If recovery inside executor produced writes, sync currentToolCalls for loop policy.
            if (Array.isArray(pass?.appliedCalls) && pass.appliedCalls.length) {
                currentToolCalls = pass.appliedCalls
            }

            exploreToolsUsed += exploresThisBatch
            agentRound += 1
            const pendingCount = Object.keys(workingVfs.pendingWrites()).length
            const exploreBudgetExhausted = exploreToolsUsed >= MAX_EXPLORE_TOOLS_PER_TURN

            if (pass?.diffLoopEscalate) {
                forceFullWrite = true
                const locked = (pass?.diffLoopPaths || []).join(', ') || 'file'
                if (! callouts.some((c) => String(c?.text || '').includes('Diff-loop breaker'))) {
                    callouts.push({
                        tone: 'warning',
                        text: `Diff-loop breaker — locked ${locked} to last valid state.`,
                    })
                }
            }

            // Empty tool batch — one write_file re-prompt, then stop (this was the 120-token credit loop).
            if (
                intent.mutation
                && pendingCount === 0
                && (pass?.missingToolCalls || ! currentToolCalls.length)
                && canContinueAgent()
                && emptyBatchReprompts < MAX_EMPTY_BATCH_REPROMPTS
            ) {
                emptyBatchReprompts += 1
                try {
                    currentToolCalls = await rePromptForWrite({
                        observations: [],
                        priorCalls: [],
                        round: agentRound,
                        label: 'Writing files…',
                        meta: { emptyBatch: true },
                    })
                    agentContinuations += 1
                    continue
                } catch (error) {
                    if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                        throw error
                    }
                    callouts.push({
                        tone: 'warning',
                        text: error?.message || 'Empty-batch write re-prompt failed.',
                    })
                    break
                }
            }

            // Unattended resume: max_tokens / empty truncated writes / prewrite rejects.
            // Chains silently up to MAX_AUTONOMOUS_TURNS — no user approval.
            const rejectedWritePaths = failedWritePathsFromObservations(pass?.observations || [])
            const emptyWritePaths = emptyWritePathsFromToolCalls(currentToolCalls)
            const incompletePaths = [...new Set([...rejectedWritePaths, ...emptyWritePaths])]
            const thisRejectKey = rejectPathKey(rejectedWritePaths)
            if (thisRejectKey) {
                rejectStreak = thisRejectKey === lastRejectKey ? rejectStreak + 1 : 1
                lastRejectKey = thisRejectKey
            } else {
                lastRejectKey = ''
                rejectStreak = 0
            }
            const rejectOnly = thisRejectKey
                && ! isMaxTokensFinishReason(lastFinishReason)
                && emptyWritePaths.length === 0
            const pageIncomplete = isPageAssemblyIncomplete(workingVfs)
            const multiPageIncomplete = isMultiPageRoutingIncomplete(workingVfs)
            let shouldAutoContinue = intent.mutation && needsAutonomousContinue({
                finishReason: lastFinishReason,
                toolCalls: currentToolCalls,
                observations: pass?.observations || [],
                workingVfs,
            })
            if (rejectOnly && rejectStreak > MAX_IDENTICAL_REJECT_CONTINUES) {
                shouldAutoContinue = false
            }
            if (shouldAutoContinue && canContinueAgent()) {
                forceFullWrite = true
                const nextPass = agentContinuations + 1
                const label = autonomousContinueLabel(nextPass, MAX_AUTONOMOUS_TURNS)
                try {
                    currentToolCalls = await rePromptForWrite({
                        observations: pass?.observations || [],
                        priorCalls: currentToolCalls,
                        round: agentRound,
                        label,
                        meta: {
                            autoContinue: true,
                            pageIncomplete,
                            multiPageIncomplete,
                            writeRejectRetry: rejectedWritePaths.length > 0,
                            rejectedPaths: rejectedWritePaths,
                            incompletePaths: pageIncomplete
                                ? [...new Set(['src/App.jsx', ...incompletePaths])]
                                : (multiPageIncomplete
                                    ? [...new Set(['src/App.jsx', 'src/components/Header.jsx', ...incompletePaths])]
                                    : incompletePaths),
                            mandateWriteFile: true,
                            finishReason: lastFinishReason,
                            maxTokens: isMaxTokensFinishReason(lastFinishReason),
                        },
                    })
                    agentContinuations += 1
                    currentToolCalls = (currentToolCalls || []).filter((c) => c?.name === 'write_file')
                    if (! currentToolCalls.length) {
                        if (
                            rejectedWritePaths.length > 0
                            && canContinueAgent()
                            && rejectStreak <= MAX_IDENTICAL_REJECT_CONTINUES
                        ) {
                            try {
                                currentToolCalls = await rePromptForWrite({
                                    observations: pass?.observations || [],
                                    priorCalls: [],
                                    round: agentRound,
                                    label: autonomousContinueLabel(),
                                    meta: {
                                        writeRejectRetry: true,
                                        rejectedPaths: rejectedWritePaths,
                                        incompletePaths: rejectedWritePaths,
                                        mandateWriteFile: true,
                                    },
                                })
                                agentContinuations += 1
                                currentToolCalls = (currentToolCalls || []).filter((c) => c?.name === 'write_file')
                                if (currentToolCalls.length) continue
                            } catch {
                                /* fall through */
                            }
                        }
                        // Budget spent with no writes — fall through to topology / stubs.
                        break
                    }
                    continue
                } catch (error) {
                    if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                        throw error
                    }
                    callouts.push({
                        tone: 'warning',
                        text: error?.message || 'Autonomous continue failed.',
                    })
                    break
                }
            }

            if (! intent.mutation || pendingCount > 0) {
                break
            }

            if (! canContinueAgent()) {
                break
            }

            // Explore-only (list/read) or noop write tools — force write_file (tool_choice).
            // Shares the single continuation slot with empty-batch / bootstrap.
            const exploreOnly = ! toolBatchHasWrite(currentToolCalls)
            const noopWrites = toolBatchHasWrite(currentToolCalls) && pendingCount === 0
            const mustMandateWrite = exploreOnly || noopWrites || exploreBudgetExhausted

            let nextCalls = null
            try {
                nextCalls = await rePromptForWrite({
                    observations: pass?.observations || [],
                    priorCalls: currentToolCalls,
                    round: agentRound,
                    label: 'Waiting for model…',
                    meta: {
                        exploreOnly,
                        noopWrites,
                        exploreBudgetExhausted,
                        mandateWriteFile: mustMandateWrite || forceFullWrite,
                    },
                })
                agentContinuations += 1
            } catch (error) {
                if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                    throw error
                }
                callouts.push({
                    tone: 'warning',
                    text: error?.message || 'Agent continuation failed.',
                })
                break
            }
            machine.assertNotAborted()

            currentToolCalls = Array.isArray(nextCalls) ? nextCalls : []

            if (! currentToolCalls.length) {
                break
            }

            // Drop explore-only follow-ups — only write_file may proceed after the single slot.
            if (! toolBatchHasWrite(currentToolCalls)) {
                currentToolCalls = currentToolCalls.filter((c) => c?.name === 'write_file')
                if (! currentToolCalls.length) break
            }

            machine.transition(TURN_STATES.EXECUTING, { agentRound, forceFullWrite })
        }

        // Mutation guard: 0 VFS writes is NOT a successful turn.
        // One hard write_file repair only if the single continuation slot was never used.
        if (intent.mutation && Object.keys(workingVfs.pendingWrites()).length === 0) {
            if (canContinueAgent()) {
                try {
                    const repairCalls = await rePromptForWrite({
                        observations: [{
                            status: 'error',
                            toolKind: 'policy',
                            summary: EXPLORE_ONLY_SYSTEM_ERROR,
                            artifacts: { exploreToolsUsed, finalRepair: true },
                        }],
                        priorCalls: currentToolCalls,
                        round: agentRound + 1,
                        label: 'Writing files…',
                        meta: { finalExploreRepair: true },
                    })
                    agentContinuations += 1
                    agentRound += 1
                    const writeOnly = (repairCalls || []).filter((c) => c?.name === 'write_file')
                    if (toolBatchHasWrite(writeOnly)) {
                        const repairPass = await runExecutorPass({
                            machine,
                            workingVfs,
                            tree,
                            userText: text,
                            assistantText,
                            toolCalls: writeOnly,
                            writeMode: intent.writeModeHint,
                            forceFullWrite: true,
                            repairBrief: EXPLORE_ONLY_SYSTEM_ERROR,
                            projectUuid,
                            allowLegacyHeuristic: false,
                            vfsContents: workingVfs.snapshot(),
                            patchGate,
                            onEvent: forwardToolEvents,
                            abortSignal,
                        })
                        if (Array.isArray(repairPass?.appliedCalls)) {
                            currentToolCalls = repairPass.appliedCalls
                        }
                    }
                } catch (error) {
                    if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                        throw error
                    }
                    callouts.push({
                        tone: 'warning',
                        text: error?.message || 'Final write_file repair failed.',
                    })
                }
            }

            // Only terminate after the hard repair still produced zero mutations.
            if (Object.keys(workingVfs.pendingWrites()).length === 0) {
                machine.transition(TURN_STATES.ROLLING_BACK)
                commitResult = rollbackWorking(workingVfs)
                callouts.push({
                    tone: 'danger',
                    text: 'Build stopped after explore-only tools — no workspace files were written. Canonical unchanged.',
                })
                machine.transition(TURN_STATES.PRESENTING, { rolledBack: true, reason: 'no_writes' })
                machine.transition(TURN_STATES.IDLE)
                return presentResult({
                    ok: false,
                    lane: LANES.BUILD,
                    intent,
                    warnings,
                    callouts,
                    commitResult: { ...commitResult, reason: 'no_writes' },
                    contextPack,
                    rolledBack: true,
                    missingWrites: true,
                })
            }
        }

        // Phase A.5 — Topology DAG preflight: drain unresolved internal imports BEFORE dry-probe.
        // Uses the same unattended autonomous budget; stubs only after exhaustion.
        if (intent.mutation && Object.keys(workingVfs.pendingWrites()).length > 0) {
            let topologyRounds = 0
            while (
                topologyRounds < MAX_TOPOLOGY_DRAIN_ROUNDS
                && canContinueAgent()
            ) {
                machine.assertNotAborted()

                const analysis = analyzeWorkingVfsTopology(workingVfs)
                ensureBarePackagesInPackageJson(workingVfs, analysis.barePackages)
                if (! topologyNeedsDrain(analysis)) {
                    break
                }

                const unresolved = pushTopologyDrainCallout(callouts, analysis)
                beginHealBridge(analysis, 'topology')
                forceFullWrite = true

                if (typeof continueAgent !== 'function') {
                    break
                }

                topologyRounds += 1
                const nextPass = agentContinuations + 1
                const drainBrief = buildTopologyDrainBrief(analysis, {
                    attempt: topologyRounds,
                    maxAttempts: MAX_TOPOLOGY_DRAIN_ROUNDS,
                })
                repairBrief = drainBrief
                const label = autonomousContinueLabel(nextPass, MAX_AUTONOMOUS_TURNS)

                onState?.({
                    state: TURN_STATES.OBSERVING,
                    label,
                    meta: {
                        topologyDrain: true,
                        topologyRound: topologyRounds,
                        autonomousPass: nextPass,
                        missing: analysis.missing,
                        unresolvedCount: unresolved,
                    },
                })
                machine.transition(TURN_STATES.OBSERVING, {
                    topologyDrain: true,
                    topologyRound: topologyRounds,
                })

                let drainCalls = []
                try {
                    const next = await continueAgent({
                        observations: [{
                            status: 'error',
                            toolKind: 'topology',
                            summary: [TOPOLOGY_MISSING_SYSTEM_ERROR, drainBrief].join(' '),
                            artifacts: {
                                missingPaths: analysis.missing,
                                unresolvedSymbols: analysis.unresolvedSymbols,
                                barePackages: analysis.barePackages,
                            },
                        }],
                        toolCalls: currentToolCalls.filter((c) => c?.name === 'write_file'),
                        round: agentRound + topologyRounds,
                        forceTools: true,
                        mandateWriteFile: true,
                        exploreOnly: false,
                        autoContinue: true,
                        statusLabel: label,
                        incompletePaths: analysis.missing || [],
                    })
                    rememberFinishReason(next)
                    agentContinuations += 1
                    drainCalls = takeToolCalls(next)
                } catch (error) {
                    if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                        throw error
                    }
                }

                if (! toolBatchHasWriteFile(drainCalls) && canContinueAgent()) {
                    try {
                        const next = await continueAgent({
                            observations: [{
                                status: 'error',
                                toolKind: 'policy',
                                summary: TOPOLOGY_MISSING_SYSTEM_ERROR,
                                artifacts: { missingPaths: analysis.missing },
                            }],
                            toolCalls: drainCalls,
                            round: agentRound + topologyRounds + 1,
                            forceTools: true,
                            mandateWriteFile: true,
                            autoContinue: true,
                            statusLabel: label,
                            incompletePaths: analysis.missing || [],
                        })
                        rememberFinishReason(next)
                        agentContinuations += 1
                        drainCalls = takeToolCalls(next)
                    } catch (error) {
                        if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                            throw error
                        }
                    }
                }

                drainCalls = drainCalls.filter((c) => c?.name === 'write_file')
                if (! drainCalls.length) {
                    break
                }

                machine.transition(TURN_STATES.EXECUTING, {
                    topologyDrain: true,
                    topologyRound: topologyRounds,
                    forceFullWrite: true,
                    mandateWriteFile: true,
                })

                const drainPass = await runExecutorPass({
                    machine,
                    workingVfs,
                    tree,
                    userText: text,
                    assistantText: drainBrief,
                    toolCalls: drainCalls,
                    writeMode: WRITE_MODES.FULL,
                    forceFullWrite: true,
                    repairBrief: drainBrief,
                    projectUuid,
                    allowLegacyHeuristic: true,
                    vfsContents: workingVfs.snapshot(),
                    patchGate,
                    onEvent: forwardToolEvents,
                    abortSignal,
                })
                if (Array.isArray(drainPass?.appliedCalls)) {
                    currentToolCalls = drainPass.appliedCalls
                }
                agentRound += 1

                // Truncated topology write — keep draining within budget.
                if (needsAutonomousContinue({
                    finishReason: lastFinishReason,
                    toolCalls: drainCalls,
                    observations: drainPass?.observations || [],
                }) && canContinueAgent()) {
                    continue
                }
            }

            // Absolute zero-fail fallback — stub any remaining gaps so dry-probe never sees MissingImport.
            const finalTopology = analyzeWorkingVfsTopology(workingVfs)
            ensureBarePackagesInPackageJson(workingVfs, finalTopology.barePackages)
            if (topologyNeedsDrain(finalTopology)) {
                const fallback = applyTopologyStubFallback(workingVfs, finalTopology)
                if (fallback.stubs.length) {
                    healStubPaths = [...new Set([...healStubPaths, ...fallback.stubs])]
                    syncPatchEngineBuffers(workingVfs, fallback.stubs)
                    beginHealBridge(finalTopology, 'stub-fallback')
                    pushHealCallout(callouts, { stubs: fallback.stubs })
                    publishVfsHealLog({
                        command: 'vfs-stub',
                        lines: fallback.stubs.map((path) => `  + stub ${path}`),
                    })
                }
            }
        }

        // Phase B — validate; system-fix loop + VFS stub heal; never dump raw rollback stacks.
        while (repairRounds <= MAX_REPAIR_ROUNDS) {
            machine.assertNotAborted()

            if (repairRounds > 0) {
                // Never burn a null-tool executor pass — re-prompt or recover from last assistant text.
                // write_file-only: always mandate write_file tool_choice.
                const mandateWriteFile = true
                let repairCalls = []
                let repairContent = ''
                if (typeof continueAgent === 'function') {
                    try {
                        const next = await continueAgent({
                            observations: [{
                                status: 'error',
                                toolKind: 'validator',
                                summary: [
                                    FORCE_WRITE_FILE_SYSTEM_ERROR,
                                    repairBrief || 'Validation failed — rewrite broken files with write_file.',
                                ].join(' '),
                                artifacts: {},
                            }, ...buildHealBufferObservations(workingVfs, healStubPaths)],
                            toolCalls: currentToolCalls.filter((c) => c?.name === 'write_file'),
                            round: agentRound + repairRounds,
                            forceTools: true,
                            mandateWriteFile,
                        })
                        repairCalls = Array.isArray(next?.toolCalls)
                            ? next.toolCalls.filter((c) => c?.name)
                            : []
                        repairContent = next?.content || ''
                    } catch (error) {
                        if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                            throw error
                        }
                    }
                }
                if (! repairCalls.length && repairContent) {
                    const recovered = recoverPseudoToolCalls(repairContent, [], {
                        vfsContents: workingVfs.snapshot(),
                    })
                    repairCalls = recovered.toolCalls
                }
                repairCalls = repairCalls.filter((c) => c?.name === 'write_file')
                // Still-no-write_file repair batch — demand write_file before applying.
                const needsWriteFile = ! toolBatchHasWriteFile(repairCalls)
                if (needsWriteFile && typeof continueAgent === 'function') {
                    try {
                        const next = await continueAgent({
                            observations: [{
                                status: 'error',
                                toolKind: 'policy',
                                summary: FORCE_WRITE_FILE_SYSTEM_ERROR,
                                artifacts: {},
                            }],
                            toolCalls: repairCalls,
                            round: agentRound + repairRounds + 1,
                            forceTools: true,
                            mandateWriteFile,
                        })
                        repairCalls = Array.isArray(next?.toolCalls)
                            ? next.toolCalls.filter((c) => c?.name)
                            : []
                        if (! repairCalls.length && next?.content) {
                            const recovered = recoverPseudoToolCalls(next.content, [], {
                                vfsContents: workingVfs.snapshot(),
                            })
                            repairCalls = recovered.toolCalls
                        }
                        repairCalls = repairCalls.filter((c) => c?.name === 'write_file')
                    } catch (error) {
                        if (error?.code === 'ABORTED' || error?.name === 'AbortError' || machine.isAborted()) {
                            throw error
                        }
                    }
                }
                const repairPass = await runExecutorPass({
                    machine,
                    workingVfs,
                    tree,
                    userText: text,
                    assistantText: repairBrief || assistantText,
                    toolCalls: repairCalls,
                    writeMode: intent.writeModeHint,
                    forceFullWrite,
                    repairBrief,
                    projectUuid,
                    allowLegacyHeuristic: allowLegacyHeuristic || forceFullWrite,
                    vfsContents: workingVfs.snapshot(),
                    patchGate,
                    onEvent: forwardToolEvents,
                    abortSignal,
                })
                if (repairPass?.diffLoopEscalate) {
                    forceFullWrite = true
                }
            }

            machine.assertNotAborted()
            machine.transition(TURN_STATES.VALIDATING)

            // Re-close the DAG after system-fix writes — stub any new gaps before dry-probe.
            {
                const preProbeTopology = analyzeWorkingVfsTopology(workingVfs)
                ensureBarePackagesInPackageJson(workingVfs, preProbeTopology.barePackages)
                if (topologyNeedsDrain(preProbeTopology)) {
                    const fallback = applyTopologyStubFallback(workingVfs, preProbeTopology)
                    if (fallback.stubs.length) {
                        healStubPaths = [...new Set([...healStubPaths, ...fallback.stubs])]
                        pushHealCallout(callouts, { stubs: fallback.stubs })
                    }
                }
            }

            // Real parse of this turn's writes (Lezer JSX/TSX) — catches the
            // syntax errors Vite would throw before anything reaches disk.
            const compileProbe = async () => probePendingSources(workingVfs.pendingWrites())

            lastValidation = await validateWorkingTree({
                workingVfs,
                fingerprints,
                compileProbe,
                abortSignal,
            })

            if (lastValidation.outcome === VALIDATOR_OUTCOMES.ABORTED) {
                machine.requestAbort('user_stop')
                break
            }

            if (
                lastValidation.outcome === VALIDATOR_OUTCOMES.PASS
                || lastValidation.outcome === VALIDATOR_OUTCOMES.PASS_WITH_WARNING
            ) {
                for (const w of lastValidation.warnings || []) warnings.push(w)
                if (lastValidation.compileTimedOut) {
                    callouts.push({ tone: 'warning', text: warnings[warnings.length - 1] })
                }
                if (healStubPaths.length) {
                    const activeStubs = healStubPaths.filter((path) => {
                        const body = String(workingVfs.read(path) || '')
                        return body.includes(VFS_STUB_MARKER)
                    })
                    if (activeStubs.length) {
                        callouts.push({
                            tone: 'warning',
                            text: `Committed with ${activeStubs.length} auto-healed module stub${activeStubs.length === 1 ? '' : 's'}.`,
                        })
                    }
                }
                finishHealBridge(true)
                break
            }

            // Automated self-correction: feed validation stack into LLM as system-fix (max 3).
            if (
                (
                    lastValidation.outcome === VALIDATOR_OUTCOMES.REPAIR
                    || lastValidation.outcome === VALIDATOR_OUTCOMES.SAME_ERROR_ESCALATE
                )
                && systemFixAttempts < MAX_SYSTEM_FIX_RETRIES
                && typeof continueAgent === 'function'
            ) {
                forceFullWrite = true
                systemFixAttempts += 1
                repairBrief = buildSystemFixPrompt({
                    errorClass: lastValidation.errorClass,
                    errors: lastValidation.errors,
                    stubs: healStubPaths,
                    attempt: systemFixAttempts,
                    maxAttempts: MAX_SYSTEM_FIX_RETRIES,
                })
                beginHealBridge(
                    healStubPaths.length || (lastValidation.errors?.length || 1),
                    'system-fix',
                )
                pushHealCallout(callouts, { stubs: healStubPaths })

                if (lastValidation.errorClass === ERROR_CLASSES.MISSING_IMPORT) {
                    const stubbed = applyMissingImportStubs(workingVfs, lastValidation.errors)
                    if (stubbed.wrote.length) {
                        healStubPaths = [...new Set([...healStubPaths, ...stubbed.wrote])]
                        syncPatchEngineBuffers(workingVfs, stubbed.wrote)
                        publishVfsHealLog({
                            command: 'vfs-stub',
                            lines: stubbed.wrote.map((path) => `  + stub ${path}`),
                        })
                    }
                }

                // Keep Patch Engine buffers aligned with post-heal Working VFS before system-fix writes.
                syncPatchEngineBuffers(workingVfs, healStubPaths)

                repairRounds += 1
                machine.transition(TURN_STATES.EXECUTING, {
                    systemFix: true,
                    repair: true,
                    forceFullWrite: true,
                    mandateWriteFile: true,
                    missingImportHeal: lastValidation.errorClass === ERROR_CLASSES.MISSING_IMPORT,
                    systemFixAttempt: systemFixAttempts,
                })
                continue
            }

            // No agent / budget exhausted — accept stub heal path when present.
            if (
                lastValidation.errorClass === ERROR_CLASSES.MISSING_IMPORT
                || healStubPaths.length > 0
            ) {
                const stubbed = applyMissingImportStubs(workingVfs, lastValidation.errors || [])
                if (stubbed.wrote.length) {
                    healStubPaths = [...new Set([...healStubPaths, ...stubbed.wrote])]
                }
                lastValidation = {
                    outcome: VALIDATOR_OUTCOMES.PASS_WITH_WARNING,
                    errorClass: null,
                    errors: [],
                    warnings: healStubPaths.length
                        ? [`Auto-healed ${healStubPaths.length} missing module(s) with temporary stubs.`]
                        : [],
                    softPass: true,
                    healedWithStubs: true,
                }
                for (const w of lastValidation.warnings) warnings.push(w)
                finishHealBridge(true)
                break
            }

            // Repair budget spent. Keep the files that parse; drop the ones
            // that still fail the syntax probe so a single typo cannot wipe
            // the rest of the turn (or ship a broken module).
            const leftover = probePendingSources(workingVfs.pendingWrites())
            if (! leftover.ok) {
                const dropped = []
                for (const err of leftover.errors || []) {
                    const path = String(err).split(' (line')[0].trim()
                    if (path && workingVfs.revert?.(path)) dropped.push(path)
                }
                if (dropped.length) {
                    lastValidation = {
                        outcome: VALIDATOR_OUTCOMES.PASS_WITH_WARNING,
                        errorClass: null,
                        errors: [],
                        warnings: [`Dropped ${dropped.length} file(s) with syntax errors — preview auto-fix will rewrite them.`],
                        softPass: true,
                    }
                    for (const w of lastValidation.warnings) warnings.push(w)
                    finishHealBridge(true)
                    break
                }
            }

            finishHealBridge(false)
            break
        }

        if (machine.isAborted()) {
            finishHealBridge(false)
            machine.transition(TURN_STATES.ABORTING)
            workingVfs?.discard?.()
            machine.transition(TURN_STATES.PRESENTING, { aborted: true })
            machine.transition(TURN_STATES.IDLE)
            return presentResult({
                ok: false,
                lane: LANES.BUILD,
                intent,
                warnings,
                callouts,
                commitResult: { ok: false, rolledBack: true, reason: 'aborted', paths: [] },
                contextPack,
                aborted: true,
            })
        }

        const canCommit = lastValidation
            && (
                lastValidation.outcome === VALIDATOR_OUTCOMES.PASS
                || lastValidation.outcome === VALIDATOR_OUTCOMES.PASS_WITH_WARNING
            )

        if (! canCommit) {
            // Never surface raw Rollback / MissingImport stacks — soft-fail without diagnostic dump.
            machine.transition(TURN_STATES.ROLLING_BACK)
            commitResult = rollbackWorking(workingVfs)
            callouts.push({
                tone: 'warning',
                text: "Couldn't finish this change safely — workspace left unchanged. Try again and I'll keep auto-healing.",
            })
            commitResult = {
                ...commitResult,
                reason: 'validation_failed_soft',
                errorClass: lastValidation?.errorClass || null,
                errors: [],
            }
            machine.transition(TURN_STATES.PRESENTING, { rolledBack: true, softFail: true })
            machine.transition(TURN_STATES.IDLE)
            return presentResult({
                ok: false,
                lane: LANES.BUILD,
                intent,
                warnings,
                callouts,
                commitResult,
                contextPack,
                validation: lastValidation
                    ? { ...lastValidation, errors: [], userSafe: true }
                    : null,
                validationFailure: null,
                rolledBack: true,
                softFail: true,
            })
        }

        const pending = workingVfs.pendingWrites()
        const pendingPaths = Object.keys(pending)

        if (intent.mutation && pendingPaths.length === 0) {
            machine.transition(TURN_STATES.ROLLING_BACK)
            commitResult = rollbackWorking(workingVfs)
            callouts.push({
                tone: 'danger',
                text: 'Build produced no VFS writes. Canonical unchanged.',
            })
            machine.transition(TURN_STATES.PRESENTING, { rolledBack: true, reason: 'no_writes' })
            machine.transition(TURN_STATES.IDLE)
            return presentResult({
                ok: false,
                lane: LANES.BUILD,
                intent,
                warnings,
                callouts,
                commitResult: { ...commitResult, reason: 'no_writes' },
                contextPack,
                validation: lastValidation,
                rolledBack: true,
                missingWrites: true,
            })
        }

        machine.transition(TURN_STATES.COMMITTING)
        const preCanonicalSnapshot = snapshotPaths(canonicalContents, pendingPaths)
        commitResult = await atomicCommit({
            workingVfs,
            scope: intent.scope,
            aborted: machine.isAborted(),
            preCanonicalSnapshot,
            persistDisk: typeof persistDisk === 'function' ? persistDisk : null,
            revertDisk: typeof revertDisk === 'function' ? revertDisk : null,
            promote: promoteToCanonical,
        })

        if (! commitResult.ok || (intent.mutation && !(commitResult.paths?.length))) {
            machine.transition(TURN_STATES.ROLLING_BACK)
            callouts.push({
                tone: 'danger',
                text: commitResult.error
                    || (commitResult.reason === 'empty'
                        ? 'Nothing was written to the workspace.'
                        : 'Atomic commit failed — Canonical unchanged.'),
            })
            machine.transition(TURN_STATES.PRESENTING, { rolledBack: true })
            machine.transition(TURN_STATES.IDLE)
            return presentResult({
                ok: false,
                lane: LANES.BUILD,
                intent,
                warnings,
                callouts,
                commitResult,
                contextPack,
                rolledBack: true,
            })
        }

        machine.transition(TURN_STATES.SYNCING_PREVIEW)
        onUi?.({ previewSync: true, paths: commitResult.paths })
        machine.transition(TURN_STATES.PRESENTING, { committed: true })
        machine.transition(TURN_STATES.IDLE)

        return presentResult({
            ok: true,
            lane: LANES.BUILD,
            intent,
            warnings,
            callouts,
            commitResult,
            contextPack,
            validation: lastValidation,
            committed: true,
        })

    } catch (error) {
        finishHealBridge(false)
        if (error?.code === 'ABORTED' || machine.isAborted()) {
            if (machine.current() !== TURN_STATES.ABORTING) {
                try { machine.transition(TURN_STATES.ABORTING) } catch { /* already */ }
            }
            workingVfs?.discard?.()
            try {
                if (machine.current() === TURN_STATES.ABORTING) {
                    machine.transition(TURN_STATES.PRESENTING, { aborted: true })
                    machine.transition(TURN_STATES.IDLE)
                }
            } catch { /* ignore */ }
            return presentResult({
                ok: false,
                lane: intent?.lane || LANES.BUILD,
                intent,
                warnings,
                callouts,
                commitResult: { ok: false, rolledBack: true, reason: 'aborted', paths: [] },
                contextPack,
                aborted: true,
            })
        }

        workingVfs?.discard?.()
        try {
            if (machine.canTransition(TURN_STATES.FAILED)) {
                machine.transition(TURN_STATES.FAILED, { error: error?.message })
            }
            if (machine.canTransition(TURN_STATES.PRESENTING)) {
                machine.transition(TURN_STATES.PRESENTING)
            }
            if (machine.canTransition(TURN_STATES.IDLE)) {
                machine.transition(TURN_STATES.IDLE)
            }
        } catch { /* ignore */ }

        return presentResult({
            ok: false,
            lane: intent?.lane || LANES.BUILD,
            intent,
            warnings,
            callouts: [...callouts, {
                tone: 'danger',
                text: error?.message || 'Turn failed — Canonical VFS unchanged.',
            }],
            commitResult: null,
            contextPack,
            error: error?.message || 'Turn failed',
        })
    }
}

function presentResult(payload) {
    return {
        ...payload,
        safety: {
            canonicalUntouched: ! payload.committed,
            compileSoftPass: Boolean(payload.validation?.compileTimedOut),
            atomic: Boolean(payload.commitResult?.atomic),
        },
    }
}

/**
 * After auto-heal / patch miss: surface live Patch Engine buffer snippets so the
 * next agent delta cannot target a stale pre-heal snapshot.
 *
 * @param {object} workingVfs
 * @param {string[]} paths
 */
function buildHealBufferObservations(workingVfs, paths = []) {
    const keys = [...new Set((paths || []).map((p) => String(p || '').trim()).filter(Boolean))]
    if (! keys.length || ! workingVfs) return []
    syncPatchEngineBuffers(workingVfs, keys)
    return keys.slice(0, 6).map((path) => {
        const body = typeof workingVfs.getFileBuffer === 'function'
            ? String(workingVfs.getFileBuffer(path) ?? '')
            : String(workingVfs.read?.(path) ?? '')
        const lines = body === '' ? [] : body.split('\n')
        const endLine = Math.min(lines.length, 40)
        const exactSnippet = lines.slice(0, endLine).join('\n').slice(0, 2_400)
        return {
            status: 'ok',
            toolKind: 'context_refresh',
            summary: `Live VFS buffer refreshed for ${path} after heal/patch miss.`,
            hint: 'context_refresh',
            artifacts: {
                path,
                exactSnippet,
                startLine: exactSnippet ? 1 : null,
                endLine: exactSnippet ? endLine : null,
                totalLines: lines.length,
                contextRefreshRequired: true,
            },
        }
    })
}

/** Host helper: request abort on an AbortController used by runOrchestratedTurn. */
export function abortTurn(controller) {
    try {
        controller?.abort?.()
    } catch {
        /* ignore */
    }
}
