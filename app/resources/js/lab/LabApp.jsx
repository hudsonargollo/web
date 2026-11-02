import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatColumn } from './components/ChatColumn'
import { FileJumpOverlay } from './components/FileJumpOverlay'
import { ConnectDatastoreModal } from './components/ConnectDatastoreModal'
import { DATASTORE_AWAIT, DATASTORE_CANCELLED, DATASTORE_READY, readLabDatastoreStatus } from './lib/datastore'
import { ImportFromGithubModal } from './components/ImportFromGithubModal'
import { GithubDeskModal } from './components/GithubDeskModal'
import { GITHUB_AWAIT } from './lib/githubRemote'
import { LabHeader } from './components/LabHeader'
import { NewFileOverlay } from './components/NewFileOverlay'
import { SaveTray, writeStoredAutoSave } from './components/SaveTray'
import { PublishModal } from './components/PublishModal'
import { UnsavedCloseModal } from './components/UnsavedCloseModal'
import { CreditExhaustedNotice } from './components/CreditExhaustedNotice'
import { LAB_CREDITS_EXHAUSTED } from './lib/labCredits'
import { WorkspaceRail } from './components/WorkspaceRail'
import { collectFilePaths } from './lib/vfs'
import {
    adoptLabUrl,
    readLabHandoffFiles,
    readLabHandoffImport,
    readLabHandoffMode,
    readLabHandoffSend,
    setDocumentTitle,
    workspaceWindowName,
} from './lib/labUrl'
import { featureAllowed, readLabEntitlement } from './lib/entitlement'
import { useChatRail } from './hooks/useChatRail'
import { PREVIEW_GUEST_ERROR_EVENT, PREVIEW_GUEST_REPAIR_EVENT, isIgnorableGuestRuntimeError } from './lib/previewGuestErrors'
import { useErrorStore } from './hooks/useErrorStore'
import { useLabBuild } from './hooks/useLabBuild'
import { useLabChat } from './hooks/useLabChat'
import { useLabProjectUrl } from './hooks/useLabProjectUrl'
import { useLabPublish } from './hooks/useLabPublish'
import { useVfsWorkspace } from './hooks/useVfsWorkspace'
import {
    VFS_HEAL_COMPLETE,
    VFS_HEAL_LOG,
    VFS_HEAL_START,
} from './orchestration/vfsHealSignal'
import { warmLabRuntime } from './lib/labPreboot'
import { repairGuestImport } from './lib/guestImportHeal'
import { looksLikeCustomRouterGuestError, repairGuestRouter } from './lib/guestRouterHeal'
import { repairGuestStubs } from './lib/guestStubHeal'
import { listComponentStubPaths } from './lib/componentStub'
import { isLabAiStreaming } from './lib/labStreamState'
import { createAttachmentFromFile } from './lib/attachments'
import { takeStudioHandoff } from './lib/studioHandoff'
import { makeEditTarget } from './lib/previewEditTargets'
import {
    clearWorkspaceHandoff,
    listenPreviewTunnelClients,
    readWorkspaceHandoff,
} from './lib/previewTunnel'

export function LabApp({ initialProject = null, initialWorkspace = false } = {}) {
    const laneRef = useRef(null)
    const threadStackRef = useRef(null)
    const latestRef = useRef(null)
    const bubbleRefs = useRef({})
    const [githubImportOpen, setGithubImportOpen] = useState(() => {
        if (typeof window === 'undefined') return false

        return readLabHandoffImport()
    })
    const [githubDeskOpen, setGithubDeskOpen] = useState(false)
    const [githubDeskWait, setGithubDeskWait] = useState(false)
    const [githubNeedRemote, setGithubNeedRemote] = useState(false)
    const [datastoreOpen, setDatastoreOpen] = useState(() => {
        if (typeof window === 'undefined') return false
        return new URLSearchParams(window.location.search).get('datastore') === '1'
    })
    const [datastoreWait, setDatastoreWait] = useState(false)
    const [datastoreOauthError, setDatastoreOauthError] = useState(() => {
        if (typeof window === 'undefined') return ''
        return new URLSearchParams(window.location.search).get('oauth_error') || ''
    })
    const initialHandoffMode = useRef(
        typeof window === 'undefined' ? null : readLabHandoffMode(),
    )
    const handoffSendRef = useRef(
        typeof window === 'undefined' ? false : readLabHandoffSend(),
    )
    const handoffFilesRef = useRef(
        typeof window === 'undefined' ? false : readLabHandoffFiles(),
    )
    const handoffConsumedRef = useRef(false)
    const [workspaceCommand, setWorkspaceCommand] = useState(null)
    const [newFileDefaultPath, setNewFileDefaultPath] = useState('src/untitled.tsx')
    const [domInspecting, setDomInspecting] = useState(false)
    const [inspectedElement, setInspectedElement] = useState(null)
    const inspectApplyRef = useRef(null)
    const [creditNotice, setCreditNotice] = useState(null)
    const entitlement = useMemo(() => readLabEntitlement(), [])
    const githubImportEntitled = featureAllowed(entitlement, 'github_import')
    const githubProjectRef = useRef(null)
    const importHealRef = useRef({ key: '', at: 0 })
    const guestBootProjectRef = useRef(null)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        if (
            params.get('datastore') !== '1'
            && ! params.get('oauth_error')
            && ! params.get('lab')
            && params.get('import') !== 'github'
            && ! params.get('brief')
            && params.get('send') !== '1'
            && params.get('send') !== 'true'
            && params.get('files') !== '1'
            && params.get('files') !== 'true'
        ) return
        params.delete('datastore')
        params.delete('oauth_error')
        params.delete('lab')
        params.delete('import')
        params.delete('brief')
        params.delete('send')
        params.delete('files')
        const query = params.toString()
        const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
        window.history.replaceState(window.history.state, '', next)
    }, [])

    useEffect(() => {
        const onAwait = () => {
            setDatastoreWait(true)
            setDatastoreOpen(true)
        }
        const onSettled = () => setDatastoreWait(false)
        window.addEventListener(DATASTORE_AWAIT, onAwait)
        window.addEventListener(DATASTORE_READY, onSettled)
        window.addEventListener(DATASTORE_CANCELLED, onSettled)
        return () => {
            window.removeEventListener(DATASTORE_AWAIT, onAwait)
            window.removeEventListener(DATASTORE_READY, onSettled)
            window.removeEventListener(DATASTORE_CANCELLED, onSettled)
        }
    }, [])

    useEffect(() => {
        const openGithub = ({ wait = false, needRemote = false } = {}) => {
            if (! githubImportEntitled) return
            if (! githubProjectRef.current) {
                setGithubImportOpen(true)
                setGithubDeskOpen(false)
                setGithubDeskWait(false)
                setGithubNeedRemote(false)
                return
            }
            setGithubNeedRemote(needRemote)
            setGithubDeskWait(wait)
            setGithubDeskOpen(true)
        }
        const onAwait = (event) => {
            openGithub({ wait: true, needRemote: Boolean(event?.detail?.needRemote) })
        }
        window.addEventListener(GITHUB_AWAIT, onAwait)
        const onOpen = () => openGithub()
        window.addEventListener('lab-github-open', onOpen)
        return () => {
            window.removeEventListener(GITHUB_AWAIT, onAwait)
            window.removeEventListener('lab-github-open', onOpen)
        }
    }, [githubImportEntitled])

    useEffect(() => {
        const onExhausted = (event) => {
            const payload = event?.detail || {}
            const entitlementRow = payload.entitlement || {}
            setCreditNotice({
                message: payload.message || '',
                upgradeUrl: entitlementRow.upgrade_url || entitlement?.upgrade_url || '/dashboard/packs',
            })
        }
        window.addEventListener(LAB_CREDITS_EXHAUSTED, onExhausted)
        return () => window.removeEventListener(LAB_CREDITS_EXHAUSTED, onExhausted)
    }, [entitlement])

    const onImportGithub = useCallback(() => {
        setGithubImportOpen(true)
    }, [])

    const project = useLabProjectUrl({ initialProject, initialWorkspace })
    const publish = useLabPublish(project.projectUuid, {
        getFiles: () => {
            if (typeof vfs.vfsApi?.getContents === 'function') {
                return vfs.vfsApi.getContents() || {}
            }
            return {
                ...(vfs.vfsContentsRef?.current || {}),
                ...(vfs.draftBuffersRef?.current || {}),
            }
        },
    })
    const {
        building,
        setBuilding,
        projectUuid,
        setProjectUuid,
        projectTitle,
        setProjectTitle,
        crumbTitle,
        composeModeReset,
    } = project

    githubProjectRef.current = projectUuid

    const vfs = useVfsWorkspace({
        projectUuid,
        projectTitle,
        building,
    })

    const tryHealGuestRouter = useCallback((message) => {
        if (! projectUuid || ! building) return
        if (! looksLikeCustomRouterGuestError(message)) return

        const key = String(message || '').slice(0, 240)
        const now = Date.now()
        if (importHealRef.current.key === `router:${key}` && now - importHealRef.current.at < 4000) return
        importHealRef.current = { key: `router:${key}`, at: now }

        void repairGuestRouter({
            projectUuid,
            getContents: () => {
                if (typeof vfs.vfsApi?.getContents === 'function') {
                    return vfs.vfsApi.getContents() || {}
                }
                return {
                    ...(vfs.vfsContentsRef?.current || {}),
                    ...(vfs.draftBuffersRef?.current || {}),
                }
            },
        })
    }, [building, projectUuid, vfs.draftBuffersRef, vfs.vfsApi, vfs.vfsContentsRef])

    const tryHealGuestImport = useCallback((message) => {
        if (! projectUuid || ! building) return
        if (! /failed to resolve import/i.test(String(message || ''))) return

        const key = String(message || '').slice(0, 240)
        const now = Date.now()
        if (importHealRef.current.key === key && now - importHealRef.current.at < 4000) return
        importHealRef.current = { key, at: now }

        void repairGuestImport({
            projectUuid,
            message,
            treePaths: [
                ...collectFilePaths(vfs.fileTree),
                ...Object.keys(vfs.previewContents || {}),
            ],
            getContents: () => {
                if (typeof vfs.vfsApi?.getContents === 'function') {
                    return vfs.vfsApi.getContents() || {}
                }
                return {
                    ...(vfs.vfsContentsRef?.current || {}),
                    ...(vfs.draftBuffersRef?.current || {}),
                }
            },
            onHydrate: (path, content) => {
                vfs.vfsApi?.writeFile?.(path, content)
            },
        })
    }, [building, projectUuid, vfs.draftBuffersRef, vfs.fileTree, vfs.previewContents, vfs.vfsApi, vfs.vfsContentsRef])

    const tryHealGuestStubs = useCallback(() => {
        if (! projectUuid || ! building) return
        const getContents = () => {
            if (typeof vfs.vfsApi?.getContents === 'function') {
                return vfs.vfsApi.getContents() || {}
            }
            return {
                ...(vfs.vfsContentsRef?.current || {}),
                ...(vfs.draftBuffersRef?.current || {}),
            }
        }
        const stubs = listComponentStubPaths(getContents())
        if (! stubs.length) return

        void repairGuestStubs({
            projectUuid,
            getContents,
            onHydrate: (path, content) => {
                vfs.vfsApi?.writeFile?.(path, content)
            },
        })
    }, [building, projectUuid, vfs.draftBuffersRef, vfs.vfsApi, vfs.vfsContentsRef])

    useEffect(() => {
        const onTables = () => vfs.openTablesFromChat()
        window.addEventListener('lab-tables-open', onTables)
        return () => window.removeEventListener('lab-tables-open', onTables)
    }, [vfs.openTablesFromChat])

    const rail = useChatRail({ building })

    const chat = useLabChat({
        initialProject,
        building,
        setBuilding,
        projectUuid,
        setProjectUuid,
        projectTitle,
        setProjectTitle,
        setRailW: rail.setRailW,
        refreshFileTree: vfs.refreshFileTree,
        applyVfsBatch: vfs.applyVfsBatch,
        beginAiStream: vfs.beginAiStream,
        endAiStream: vfs.endAiStream,
        cancelAiStream: vfs.cancelAiStream,
        vfsContentsRef: vfs.vfsContentsRef,
        draftBuffersRef: vfs.draftBuffersRef,
        fileTreeRef: vfs.fileTreeRef,
        workspaceViewRef: vfs.workspaceViewRef,
        isAiStreamingRef: vfs.isAiStreamingRef,
        prevProjectUuidRef: vfs.prevProjectUuidRef,
        laneRef,
        latestRef,
        bubbleRefs,
        threadStackRef,
    })

    const build = useLabBuild({
        building,
        setBuilding,
        busy: chat.busy,
        turns: chat.turns,
        setTurns: chat.setTurns,
        setAnchorId: chat.setAnchorId,
        setRailW: rail.setRailW,
        beginShelf: chat.beginShelf,
        sendRef: chat.sendRef,
    })

    const errors = useErrorStore({
        getVfsContents: () => {
            if (typeof vfs.vfsApi?.getContents === 'function') {
                return vfs.vfsApi.getContents() || {}
            }
            return {
                ...(vfs.vfsContentsRef?.current || {}),
                ...(vfs.draftBuffersRef?.current || {}),
                ...(vfs.previewContents || {}),
            }
        },
    })

    const fixErrorTarget = errors.visible ? errors.repairTarget : null

    const onFixError = useCallback(() => {
        // Explicit user gesture only — never silent background repair.
        if (chat.busy) return
        errors.requestRepair(chat.send)
    }, [chat.busy, chat.send, errors.requestRepair])

    const onDismissFixError = useCallback(() => {
        errors.dismiss()
    }, [errors.dismiss])

    const onGithubImported = useCallback(async (result) => {
        const next = result?.project
        const uuid = next?.uuid || projectUuid
        if (! uuid) return

        if (next?.uuid) {
            setProjectUuid(next.uuid)
            adoptLabUrl(next.uuid, true, { replace: true })
        }
        if (next?.title) {
            setProjectTitle(next.title)
            setDocumentTitle(next.title)
        }

        // Open the workspace rail without queueing an AI auto-build turn.
        setBuilding(true)
        await vfs.refreshFileTree(uuid, { force: true })

        const starter = typeof result?.first_prompt === 'string' ? result.first_prompt.trim() : ''
        if (starter) {
            await chat.send({ content: starter })
        }
    }, [chat, projectUuid, setBuilding, setProjectTitle, setProjectUuid, vfs.refreshFileTree])

    useEffect(() => {
        if (handoffConsumedRef.current) return

        const wantSend = handoffSendRef.current
        const wantFiles = handoffFilesRef.current
        if (! wantSend && ! wantFiles) return
        if (chat.busy) return

        let cancelled = false

        ;(async () => {
            const raw = wantFiles ? await takeStudioHandoff() : []
            if (cancelled || handoffConsumedRef.current) return

            handoffConsumedRef.current = true
            const attachments = raw.map(createAttachmentFromFile)
            if (attachments.length) {
                chat.addFiles(attachments)
            }

            if (! wantSend) return

            const text = (chat.draft || '').trim()
            if (! text && attachments.length === 0) {
                handoffSendRef.current = false
                return
            }

            handoffSendRef.current = false
            await chat.send({ content: text, attachments })
        })()

        return () => {
            cancelled = true
        }
    }, [chat.addFiles, chat.busy, chat.draft, chat.send])

    // DeepThought: Console autostart (background) + Preview stays focused.
    useEffect(() => {
        if (!projectUuid || !building) return undefined

        vfs.openConsoleFromChat({ focus: false })
        vfs.openPreviewFromChat()

        return () => {
            void import('./lib/labPreboot').then((m) => m.resetLabRuntimeWarm?.())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- vfs identity churns
    }, [projectUuid, building])

    useEffect(() => {
        if (! projectUuid || ! building || vfs.filesLoading) return undefined

        void (async () => {
            const files = (() => {
                if (typeof vfs.vfsApi?.getContents === 'function') {
                    return vfs.vfsApi.getContents() || {}
                }
                return {
                    ...(vfs.vfsContentsRef?.current || {}),
                    ...(vfs.draftBuffersRef?.current || {}),
                }
            })()

            if (guestBootProjectRef.current !== projectUuid) {
                guestBootProjectRef.current = projectUuid
                await import('./lib/labPreboot').then((m) => m.resetLabRuntimeWarm?.())
            }

            warmLabRuntime({ files })

            if (Object.keys(files).length) {
                const runtime = await import('./lib/labRuntime')
                await runtime.syncLabVfsToGuest(files, { force: true })
            }

            tryHealGuestStubs()

            vfs.openConsoleFromChat({ focus: false })
            vfs.openPreviewFromChat()
        })()

        return undefined
        // eslint-disable-next-line react-hooks/exhaustive-deps -- vfs identity churns
    }, [projectUuid, building, vfs.filesLoading, tryHealGuestStubs])

    // Preview iframe Error Boundary "Fix with AI" → same repair turn as the Action Card.
    useEffect(() => {
        const onPreviewRepair = () => {
            if (chat.busy) return
            errors.requestRepair(chat.send)
        }
        window.addEventListener(PREVIEW_GUEST_REPAIR_EVENT, onPreviewRepair)
        return () => window.removeEventListener(PREVIEW_GUEST_REPAIR_EVENT, onPreviewRepair)
    }, [chat.busy, chat.send, errors.requestRepair])

    // Preview guest console/runtime errors → Action Card only.
    // Repair starts when the user clicks Fix with AI (or the iframe button).
    useEffect(() => {
        const onGuestConsoleError = (event) => {
            const detail = event?.detail || {}
            const message = String(detail.message || '').trim()
            if (! message) return
            if (detail.category !== 'BUILD_ERROR' && isIgnorableGuestRuntimeError(message, detail.stack)) return

            // Mid-turn compile/runtime noise — heal quietly; tur bitince gerçek hata kalırsa göster.
            if (isLabAiStreaming() || chat.busy) {
                tryHealGuestRouter(message)
                tryHealGuestImport(message)
                return
            }

            tryHealGuestRouter(message)
            if (detail.category === 'BUILD_ERROR') {
                tryHealGuestImport(message)
                errors.setBuildError({
                    message,
                    stack: detail.stack,
                    file: detail.file,
                    line: detail.line,
                    source: 'preview_iframe',
                })
            } else {
                errors.addConsoleError({
                    message,
                    stack: detail.stack,
                    file: detail.file,
                    line: detail.line,
                    component: detail.component,
                    source: 'preview_iframe',
                    category: 'RUNTIME_ERROR',
                })
            }
        }

        window.addEventListener(PREVIEW_GUEST_ERROR_EVENT, onGuestConsoleError)
        return () => {
            window.removeEventListener(PREVIEW_GUEST_ERROR_EVENT, onGuestConsoleError)
        }
    }, [errors, tryHealGuestImport, tryHealGuestRouter, chat.busy])

    useEffect(() => {
        if (isLabAiStreaming() || chat.busy) return undefined
        const message = String(errors.buildError?.message || '').trim()
        if (! message) return undefined
        tryHealGuestImport(message)
        return undefined
    }, [errors.buildError, tryHealGuestImport, chat.busy])

    // VFS dependency heal → Terminal focus, session logs, Preview return after compile.
    useEffect(() => {
        if (! building) return undefined

        let previewTimer = null
        const healActiveRef = { current: false }

        const onStart = () => {
            clearTimeout(previewTimer)
            healActiveRef.current = true
            vfs.openConsoleFromChat()
        }

        const onLog = (event) => {
            const detail = event?.detail || {}
            vfs.appendConsoleSession({
                command: detail.command || 'vfs-heal',
                lines: detail.lines || [],
                exitCode: detail.exitCode || 0,
            })
        }

        const onComplete = (event) => {
            const detail = event?.detail || {}
            const wasActive = healActiveRef.current
            healActiveRef.current = false
            if (Array.isArray(detail.lines) && detail.lines.length) {
                vfs.appendConsoleSession({
                    command: 'compile',
                    lines: detail.lines,
                    exitCode: detail.ok === false ? 1 : 0,
                })
            }
            if (! wasActive || detail.ok === false) return
            previewTimer = setTimeout(() => {
                vfs.openPreviewFromChat()
            }, 500)
        }

        window.addEventListener(VFS_HEAL_START, onStart)
        window.addEventListener(VFS_HEAL_LOG, onLog)
        window.addEventListener(VFS_HEAL_COMPLETE, onComplete)
        return () => {
            clearTimeout(previewTimer)
            window.removeEventListener(VFS_HEAL_START, onStart)
            window.removeEventListener(VFS_HEAL_LOG, onLog)
            window.removeEventListener(VFS_HEAL_COMPLETE, onComplete)
        }
    }, [
        building,
        vfs.openConsoleFromChat,
        vfs.openPreviewFromChat,
        vfs.appendConsoleSession,
    ])

    // History back from workspace → reset editor rail mode.
    const setComposeMode = vfs.setComposeMode
    useEffect(() => {
        if (composeModeReset > 0) {
            setComposeMode('rail')
        }
    }, [composeModeReset, setComposeMode])

    const onOpenPath = useCallback((path) => {
        if (! building) return
        const name = path.split('/').filter(Boolean).pop() || path
        vfs.handleOpenFile({ path, name })
    }, [building, vfs.handleOpenFile])

    const workspaceFilePaths = useMemo(() => {
        const fromTree = collectFilePaths(vfs.fileTree)
        const extra = Object.keys(vfs.previewContents || {})
        return [...new Set([...fromTree, ...extra])].sort((a, b) => a.localeCompare(b))
    }, [vfs.fileTree, vfs.previewContents])

    const recentFilePaths = useMemo(() => {
        const alive = new Set(workspaceFilePaths)
        return (vfs.recentPaths || []).filter((path) => alive.has(path))
    }, [vfs.recentPaths, workspaceFilePaths])

    const toggleAutoSave = useCallback(() => {
        vfs.setAutoSave((on) => {
            const next = ! on
            writeStoredAutoSave(next)
            if (next) {
                window.setTimeout(() => {
                    vfs.saveAllDirty()
                }, 0)
            }
            return next
        })
    }, [vfs])

    const onWorkspaceCommand = useCallback((id) => {
        if (id === 'supabase' || id === 'connect-supabase') {
            readLabDatastoreStatus()
                .then((row) => {
                    if (row?.ready) {
                        vfs.openTablesFromChat()
                        return
                    }
                    setDatastoreOpen(true)
                })
                .catch(() => setDatastoreOpen(true))
            return
        }
        if (! building) return
        if (id === 'new-file') {
            setNewFileDefaultPath(vfs.suggestUntitledPath())
            setWorkspaceCommand(id)
            return
        }
        if (id === 'find-file' || id === 'recently-opened') {
            setWorkspaceCommand(id)
        }
    }, [building, vfs])

    const closeWorkspaceCommand = useCallback(() => {
        setWorkspaceCommand(null)
    }, [])

    const onJumpOpenPath = useCallback((path) => {
        onOpenPath(path)
        setWorkspaceCommand(null)
    }, [onOpenPath])

    const onOpenConsole = building ? vfs.openConsoleFromChat : undefined

    const toggleDomInspect = useCallback(() => {
        if (! building) return
        setDomInspecting((on) => {
            const next = ! on
            if (! next) setInspectedElement(null)
            return next
        })
        // Prefer Preview tab so the picker is visible.
        if (! domInspecting) {
            vfs.openPreviewFromChat?.()
        }
    }, [building, domInspecting, vfs.openPreviewFromChat])

    const onInspectSelect = useCallback((element) => {
        setInspectedElement(element || null)
    }, [])

    const onStartInspect = useCallback((element) => {
        if (element) setInspectedElement(element)
        setDomInspecting(true)
    }, [])

    const onInspectClear = useCallback(() => {
        setInspectedElement(null)
    }, [])

    const onInspectStop = useCallback(() => {
        setDomInspecting(false)
        setInspectedElement(null)
    }, [])

    const onAskLab = useCallback((prompt) => {
        const text = String(prompt || '').trim()
        if (! text) return
        chat.setDraft(text)
        try {
            window.dispatchEvent(new CustomEvent('krikkit-lab-focus-composer'))
        } catch {
            /* ignore */
        }
    }, [chat.setDraft])

    const onPinPreviewEdit = useCallback((spec) => {
        const target = spec?.element
            ? makeEditTarget(spec)
            : spec
        if (! target) return
        chat.addEditTarget(target, { focus: spec?.action !== 'applied' })
    }, [chat.addEditTarget])

    const applyPreviewHandoff = useCallback((payload) => {
        if (! payload) return
        const mode = payload.mode === 'inspect' ? 'inspect' : 'edit'
        const target = payload.target || null
        if (! building) setBuilding(true)
        vfs.openPreviewFromChat?.()
        if (target) {
            chat.addEditTarget(target, { focus: true })
        }
        if (mode === 'inspect') {
            if (target?.element) setInspectedElement(target.element)
            setDomInspecting(true)
        }
        window.setTimeout(() => {
            try {
                window.dispatchEvent(new CustomEvent('krikkit-lab-focus-composer'))
            } catch {
                /* ignore */
            }
        }, 40)
        window.setTimeout(() => clearWorkspaceHandoff(projectUuid), 1500)
    }, [building, chat.addEditTarget, projectUuid, setBuilding, vfs.openPreviewFromChat])

    const applyPreviewHandoffRef = useRef(applyPreviewHandoff)
    applyPreviewHandoffRef.current = applyPreviewHandoff

    useEffect(() => {
        if (! projectUuid || typeof window === 'undefined') return undefined
        window.name = workspaceWindowName(projectUuid)
        const apply = (payload) => applyPreviewHandoffRef.current?.(payload)
        const stored = readWorkspaceHandoff(projectUuid)
        const queryMode = initialHandoffMode.current
        if (stored) {
            apply(stored)
        } else if (queryMode) {
            apply({ mode: queryMode, target: null })
        }
        return listenPreviewTunnelClients(projectUuid, {
            onHandoff: apply,
        })
    }, [projectUuid])

    // Leave inspect mode when leaving the workspace / Escape.
    useEffect(() => {
        if (! building) {
            setDomInspecting(false)
            setInspectedElement(null)
        }
    }, [building])

    useEffect(() => {
        if (! domInspecting) return undefined
        const onKey = (event) => {
            if (event.key === 'Escape') {
                setDomInspecting(false)
                setInspectedElement(null)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [domInspecting])

    // Keep last pick available for the next step (panel / chat handoff).
    useEffect(() => {
        if (! inspectedElement) return
        try {
            window.__krikkitLastInspected = inspectedElement
        } catch {
            /* ignore */
        }
    }, [inspectedElement])

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-krikkit-canvas">
            <LabHeader
                building={building}
                railW={rail.railW}
                railResizing={rail.railResizing}
                crumbTitle={crumbTitle}
                busy={chat.busy}
                projectUuid={projectUuid}
                onOpenWorkspace={build.openWorkspaceManual}
                dirtyPaths={vfs.dirtyPaths}
                openFileSignal={vfs.openFileSignal}
                openConsoleSignal={vfs.openConsoleSignal}
                openPreviewSignal={vfs.openPreviewSignal}
                openTablesSignal={vfs.openTablesSignal}
                onPanelChange={vfs.handleWorkspaceView}
                onRequestCloseTab={vfs.handleRequestCloseTab}
                onWorkspaceCommand={onWorkspaceCommand}
                onPublish={publish.enabled ? () => publish.setOpen(true) : null}
                publishStatus={publish.status}
            />

            <main className="flex min-h-0 flex-1 flex-row overflow-hidden">
                <ChatColumn
                    live={chat.live}
                    building={building}
                    busy={chat.busy}
                    railW={rail.railW}
                    railResizing={rail.railResizing}
                    chatRailRef={rail.chatRailRef}
                    onRailResizeStart={rail.onRailResizeStart}
                    turns={chat.turns}
                    shelfTurnId={chat.shelfTurnId}
                    shelfMinHeight={chat.shelfMinHeight}
                    laneRef={laneRef}
                    threadStackRef={threadStackRef}
                    latestRef={latestRef}
                    bubbleRefs={bubbleRefs}
                    showFollowButton={chat.showFollowButton}
                    onResumeFollow={chat.resumeFollow}
                    onOpenPath={building ? onOpenPath : undefined}
                    onOpenConsole={onOpenConsole}
                    onSkipGate={build.skipBuildGate}
                    onAcceptGate={build.acceptBuildGate}
                    onPickSuggestion={chat.pickSuggestion}
                    draft={chat.draft}
                    onDraftChange={chat.setDraft}
                    onSend={chat.send}
                    onStop={chat.stopTurn}
                    files={chat.files}
                    onAddFiles={chat.addFiles}
                    onRemoveFile={chat.removeFile}
                    turnStatusLabel={chat.turnStatusLabel}
                    fixErrorTarget={fixErrorTarget}
                    onFixError={onFixError}
                    onDismissFixError={onDismissFixError}
                    onImportGithub={onImportGithub}
                    inspecting={domInspecting}
                    onToggleInspect={toggleDomInspect}
                    inspectAvailable={building}
                    editTargets={chat.editTargets}
                    onRemoveEditTarget={chat.removeEditTarget}
                />

                <WorkspaceRail
                    building={building}
                    layoutInstant={vfs.layoutInstant}
                    composeMode={vfs.composeMode}
                    workspaceView={vfs.workspaceView}
                    draftBuffers={vfs.draftBuffers}
                    fileTree={vfs.fileTree}
                    filesLoading={vfs.filesLoading}
                    filesError={vfs.filesError}
                    projectUuid={projectUuid}
                    previewLive={vfs.previewLive}
                    previewContents={vfs.previewContents}
                    vfsApi={vfs.vfsApi}
                    projectTitle={projectTitle}
                    isAiStreaming={vfs.isAiStreaming}
                    aiWriting={vfs.aiWriting}
                    previewReloadPending={vfs.previewReloadPending}
                    aiBusy={chat.busy}
                    turnStatusLabel={chat.turnStatusLabel}
                    thinkingLive={Boolean(
                        chat.turns.at(-1)?.thinking?.status === 'streaming'
                        && ! chat.turns.at(-1)?.bot,
                    )}
                    consoleSessionLog={vfs.consoleSessionLog}
                    openConsoleSignal={vfs.openConsoleSignal}
                    onChangeBuffer={vfs.updateDraftBuffer}
                    onOpenFile={vfs.handleOpenFile}
                    inspecting={domInspecting}
                    onInspectSelect={onInspectSelect}
                    onInspectStop={onInspectStop}
                    inspectedElement={inspectedElement}
                    onInspectClear={onInspectClear}
                    inspectApplyRef={inspectApplyRef}
                    onAskLab={onAskLab}
                    onStartInspect={onStartInspect}
                    onPinPreviewEdit={onPinPreviewEdit}
                    autoSave={vfs.autoSave}
                    onToggleAutoSave={toggleAutoSave}
                    onConnectDatastore={() => setDatastoreOpen(true)}
                    onChangeDatastore={() => setDatastoreOpen(true)}
                />
            </main>

            <SaveTray
                visible={building}
                dirtyCount={vfs.dirtyCount}
                autoSave={vfs.autoSave}
                saving={vfs.saving}
                onSave={() => {
                    vfs.saveAllDirty()
                }}
                onToggleAutoSave={toggleAutoSave}
                onDontSave={vfs.discardAllDirty}
            />

            <FileJumpOverlay
                open={workspaceCommand === 'find-file'}
                mode="find"
                paths={workspaceFilePaths}
                onClose={closeWorkspaceCommand}
                onOpen={onJumpOpenPath}
            />

            <FileJumpOverlay
                open={workspaceCommand === 'recently-opened'}
                mode="recent"
                paths={recentFilePaths}
                onClose={closeWorkspaceCommand}
                onOpen={onJumpOpenPath}
            />

            <NewFileOverlay
                open={workspaceCommand === 'new-file'}
                defaultPath={newFileDefaultPath}
                onClose={closeWorkspaceCommand}
                onCreate={vfs.createBlankFile}
            />

            <PublishModal
                open={publish.open}
                payload={publish.payload}
                busy={publish.busy}
                buildPhase={publish.buildPhase}
                buildLogs={publish.buildLogs}
                logRef={publish.logRef}
                publishingInBrowser={publish.publishingInBrowser}
                staleBuild={publish.staleBuild}
                error={publish.error}
                onClose={() => publish.setOpen(false)}
                onPublish={publish.publish}
                onContinuePublish={publish.continuePublish}
                onVerify={publish.verify}
                onUnpublish={publish.unpublish}
            />

            <UnsavedCloseModal
                open={Boolean(vfs.pendingClose)}
                fileLabel={vfs.pendingClose?.tab?.label || vfs.pendingClose?.tab?.path || 'this file'}
                onSave={vfs.confirmCloseSave}
                onDiscard={vfs.confirmCloseDiscard}
                onCancel={() => vfs.setPendingClose(null)}
            />

            <CreditExhaustedNotice
                open={Boolean(creditNotice)}
                message={creditNotice?.message || ''}
                upgradeUrl={creditNotice?.upgradeUrl || '/dashboard/packs'}
                onClose={() => setCreditNotice(null)}
            />

            <ImportFromGithubModal
                open={githubImportOpen}
                projectUuid={projectUuid}
                onClose={() => setGithubImportOpen(false)}
                onImported={onGithubImported}
            />

            {githubImportEntitled ? (
                <GithubDeskModal
                    open={githubDeskOpen}
                    waitMode={githubDeskWait}
                    needRemote={githubNeedRemote}
                    projectUuid={projectUuid}
                    onClose={() => {
                        setGithubDeskOpen(false)
                        setGithubDeskWait(false)
                    }}
                    onRequestImport={() => {
                        setGithubDeskOpen(false)
                        setGithubImportOpen(true)
                    }}
                    onPulled={(payload) => {
                        if (payload?.tree) vfs.refreshFileTree?.(projectUuid, { force: true })
                    }}
                />
            ) : null}

            <ConnectDatastoreModal
                open={datastoreOpen}
                waitMode={datastoreWait}
                initialError={datastoreOauthError}
                onClose={() => {
                    setDatastoreOpen(false)
                    setDatastoreWait(false)
                    setDatastoreOauthError('')
                }}
            />
        </div>
    )
}
