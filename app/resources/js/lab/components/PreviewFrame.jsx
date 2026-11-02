import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LAB_RUNTIME_PHASE } from '../lib/labAutostart'
import { PUBLISH_MEMORY_EVENT } from '../lib/publishMemory'
import {
    ensureLabSession,
    getLabRuntime,
    getPreviewPort,
    getPreviewUrl,
    onLabRuntimePort,
    PREVIEW_RESYNC_EVENT,
    requestPreviewResync,
    resolveGuestListenPort,
    pushLabPreview,
} from '../lib/labRuntime'
import {
    VFS_HEAL_COMPLETE,
    VFS_HEAL_START,
} from '../orchestration/vfsHealSignal'
import {
    PREVIEW_CHROME_REV,
    PREVIEW_CHROME_SCRIPT,
    isPreviewChromeMessage,
    postToPreview,
    readInspectTheme,
} from '../lib/previewChromeBridge'
import { PreviewChrome, labelFromPath, nextViewportId, viewportWidthFor } from './PreviewChrome'
import { PreviewBucket, resolvePreviewActivity } from './PreviewBucket'
import { PreviewMissing } from './PreviewMissing'
import { PreviewContextMenu } from './PreviewContextMenu'
import { guestHref, labPreviewHref } from '../lib/labPreviewUrl'
import { dispatchPreviewGuestError, isIgnorableGuestRuntimeError } from '../lib/previewGuestErrors'
import { clearConsoleErrors } from '../lib/labErrors'
import { discoverGuestRoutes, guestRouteKnown, guestRoutesAsPages } from '../lib/previewRoutes'
import { previewLooksBooting, previewLooksHollow, previewLooksLive, previewLooksRefused, previewLooksViteGuest } from '../lib/previewProbe'
import { usePreviewCover } from '../hooks/usePreviewCover'
import { makeEditTarget } from '../lib/previewEditTargets'
import {
    listenPreviewTunnelClients,
    publishPreviewTunnel,
} from '../lib/previewTunnel'

function slugHost(title) {
    const slug = String(title || 'preview')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24)
    return `${slug || 'preview'}.lab`
}

function pageEntry(path) {
    const clean = String(path || '/').split('?')[0].split('#')[0] || '/'
    return { id: clean, label: labelFromPath(clean), path: clean }
}

async function installChromeBridge() {
    try {
        const eng = getLabRuntime() || await ensureLabSession()
        await eng?.setPreviewScript?.(PREVIEW_CHROME_SCRIPT)
    } catch {
        /* ignore */
    }
}

/**
 * Live preview iframe — src is the DeepThought tunnel URL (engine.port(n)).
 */
export function PreviewFrame({
    live = false,
    projectTitle = 'Preview',
    projectUuid = null,
    vfsContents = null,
    isAiStreaming = false,
    aiWriting = false,
    previewReloadPending = false,
    aiBusy = false,
    turnStatusLabel = '',
    thinkingLive = false,
    inspecting = false,
    pickedElement = null,
    onInspectSelect = null,
    onInspectStop = null,
    inspectApplyRef = null,
    onAskLab = null,
    onStartInspect = null,
    onPinPreviewEdit = null,
    visible = true,
}) {
    const iframeRef = useRef(null)
    const histRef = useRef({ stack: ['/'], index: 0 })
    const pathRef = useRef('/')
    const urlRef = useRef(null)
    const [port, setPort] = useState(() => getPreviewPort())
    const [url, setUrl] = useState(() => getPreviewUrl())
    const [status, setStatus] = useState('idle')
    const [error, setError] = useState(null)
    const [currentPath, setCurrentPath] = useState('/')
    const [canBack, setCanBack] = useState(false)
    const [canForward, setCanForward] = useState(false)
    const [viewportId, setViewportId] = useState('desktop')
    const [iframeNonce, setIframeNonce] = useState(0)
    const [copyFlash, setCopyFlash] = useState(false)
    const [runtimePhase, setRuntimePhase] = useState(null)
    const [healing, setHealing] = useState(false)
    const [pages, setPages] = useState(() => [pageEntry('/')])
    const [frameSrc, setFrameSrc] = useState(null)
    const [picked, setPicked] = useState(null)
    const [contextMenu, setContextMenu] = useState(null)
    const [missingPath, setMissingPath] = useState(null)
    const [frameBlocked, setFrameBlocked] = useState(false)
    const [publishSuspended, setPublishSuspended] = useState(false)
    const [frameReady, setFrameReady] = useState(false)
    const [guestPainted, setGuestPainted] = useState(false)
    const pickedRef = useRef(null)
    const wantTunnelRef = useRef(false)
    const pinTargetRef = useRef(null)
    const missingPathRef = useRef(null)
    const routeTableRef = useRef({ routes: new Set(['/']), catchAll: false })
    const refusedRetryRef = useRef(0)
    const guestPaintedRef = useRef(false)

    const routeTable = useMemo(() => discoverGuestRoutes(vfsContents), [vfsContents])
    routeTableRef.current = routeTable

    const routeCatalogKey = useMemo(
        () => [...routeTable.routes].sort().join('\0'),
        [routeTable],
    )

    useEffect(() => {
        const discovered = guestRoutesAsPages(routeTable.routes)
        if (! discovered.length) return
        setPages((prev) => {
            const byPath = new Map(discovered.map((entry) => [entry.path, entry]))
            for (const entry of prev) {
                if (! byPath.has(entry.path)) byPath.set(entry.path, entry)
            }
            return guestRoutesAsPages(new Set(byPath.keys()))
        })
    }, [routeCatalogKey, routeTable.routes])
    missingPathRef.current = missingPath

    pathRef.current = currentPath
    urlRef.current = url
    pickedRef.current = picked

    useEffect(() => {
        if (pickedElement) setPicked(pickedElement)
    }, [pickedElement])

    const host = useMemo(() => slugHost(projectTitle), [projectTitle])
    const width = viewportWidthFor(viewportId)

    const syncHistoryFlags = useCallback(() => {
        const hist = histRef.current
        setCanBack(hist.index > 0)
        setCanForward(hist.index < hist.stack.length - 1)
    }, [])

    const rememberPath = useCallback((path, { replace = false, catalog = true } = {}) => {
        const next = path || '/'
        const hist = histRef.current
        if (replace || hist.stack[hist.index] === next) {
            hist.stack[hist.index] = next
        } else {
            hist.stack = hist.stack.slice(0, hist.index + 1)
            hist.stack.push(next)
            hist.index = hist.stack.length - 1
        }
        setCurrentPath(next)
        syncHistoryFlags()
        if (! catalog) return
        const entry = pageEntry(next)
        setPages((list) => (list.some((p) => p.path === entry.path) ? list : [...list, entry]))
    }, [syncHistoryFlags])

    const remountAt = useCallback((path) => {
        const base = urlRef.current || getPreviewUrl()
        if (! base) return
        setFrameReady(false)
        setGuestPainted(false)
        setFrameSrc(guestHref(base, path || '/'))
        setIframeNonce((token) => token + 1)
    }, [])

    const markFrameReady = useCallback(() => {
        refusedRetryRef.current = 0
        setFrameBlocked(false)
        setFrameReady(true)
        setStatus((cur) => (cur === 'loading' || cur === 'ready' ? 'live' : cur))
    }, [])

    useEffect(() => {
        if (frameReady) return undefined
        setGuestPainted(false)
        return undefined
    }, [frameReady])

    useEffect(() => {
        const onPhase = (event) => {
            const phase = event?.detail?.phase
            if (phase) setRuntimePhase(phase)
            if (phase === 'boot' || phase === 'install' || phase === 'dev') {
                setFrameReady(false)
                setGuestPainted(false)
            }
        }
        const onHealStart = () => setHealing(true)
        const onHealDone = () => setHealing(false)
        window.addEventListener(LAB_RUNTIME_PHASE, onPhase)
        window.addEventListener(VFS_HEAL_START, onHealStart)
        window.addEventListener(VFS_HEAL_COMPLETE, onHealDone)
        return () => {
            window.removeEventListener(LAB_RUNTIME_PHASE, onPhase)
            window.removeEventListener(VFS_HEAL_START, onHealStart)
            window.removeEventListener(VFS_HEAL_COMPLETE, onHealDone)
        }
    }, [])

    useEffect(() => {
        const onPublishMemory = (event) => {
            const suspended = Boolean(event?.detail?.suspended)
            setPublishSuspended(suspended)
            if (suspended) {
                setFrameSrc(null)
                setFrameReady(false)
                setGuestPainted(false)
                return
            }
            const base = urlRef.current || getPreviewUrl()
            if (live && port && base) {
                remountAt(pathRef.current || '/')
            }
        }
        window.addEventListener(PUBLISH_MEMORY_EVENT, onPublishMemory)
        return () => window.removeEventListener(PUBLISH_MEMORY_EVENT, onPublishMemory)
    }, [live, port, remountAt])

    useEffect(() => {
        void installChromeBridge()
        return onLabRuntimePort((ev) => {
            if (ev?.type === 'open' && ev.port) {
                setPort(ev.port)
                const nextUrl = ev.url || getPreviewUrl()
                setUrl(nextUrl)
                setError(null)
                setStatus('live')
                setFrameBlocked(false)
                refusedRetryRef.current = 0
                void installChromeBridge()
                if (! ev.replay) {
                    setFrameReady(false)
                    if (nextUrl) {
                        setFrameSrc(guestHref(nextUrl, pathRef.current || '/'))
                        setIframeNonce((token) => token + 1)
                    }
                }
            }
            if (ev?.type === 'close') {
                setFrameReady(false)
                setFrameBlocked(true)
                const still = resolveGuestListenPort()
                if (! still) {
                    setPort(null)
                    setUrl(null)
                    setStatus('idle')
                    setFrameSrc(null)
                    setFrameBlocked(false)
                }
            }
        })
    }, [])

    useEffect(() => {
        if (! live) return undefined
        const sync = () => {
            const p = resolveGuestListenPort() || getPreviewPort()
            const u = getPreviewUrl()
            if (p) setPort((cur) => cur || p)
            if (u) setUrl((cur) => cur || u)
        }
        sync()
        const id = setInterval(sync, 1000)
        return () => clearInterval(id)
    }, [live])

    useEffect(() => {
        wantTunnelRef.current = Boolean(live && port)
        if (! live) {
            setFrameReady(false)
            setFrameBlocked(false)
        }
        if (! live || ! port) {
            setStatus(port ? 'ready' : 'idle')
            return undefined
        }

        const src = url || getPreviewUrl()
        if (src && src !== url) {
            setUrl(src)
            return undefined
        }
        if (! src) {
            setStatus('loading')
            return undefined
        }

        setStatus((cur) => (cur === 'live' ? cur : 'loading'))
        void installChromeBridge().then(() => {
            if (! wantTunnelRef.current) return
            setStatus('live')
            setError(null)
            setFrameSrc((cur) => cur || guestHref(src, pathRef.current || '/'))
        })
        return undefined
    }, [live, port, url])

    const chromeRevRef = useRef(0)
    useEffect(() => {
        if (! live) return undefined
        if (chromeRevRef.current === PREVIEW_CHROME_REV) return undefined
        chromeRevRef.current = PREVIEW_CHROME_REV
        void installChromeBridge().then(() => {
            if (iframeRef.current) remountAt(pathRef.current)
        })
        return undefined
    }, [live, remountAt, PREVIEW_CHROME_REV])

    useEffect(() => {
        const onMessage = (event) => {
            const data = event?.data
            if (! isPreviewChromeMessage(data)) return

            if (data.type === 'need-reload') {
                remountAt(data.path || pathRef.current)
                return
            }

            if (data.type === 'cover-painted') {
                guestPaintedRef.current = true
                setGuestPainted(true)
                clearConsoleErrors()
                markFrameReady()
                return
            }

            if (data.type === 'guest-console-error') {
                if (isAiStreaming || aiBusy) return
                if (data.category !== 'BUILD_ERROR' && ! guestPaintedRef.current) return
                if (isIgnorableGuestRuntimeError(data.message, data.stack)) return
                dispatchPreviewGuestError({
                    message: data.message,
                    stack: data.stack,
                    file: data.file,
                    line: data.line,
                    component: data.component,
                    category: data.category,
                })
                return
            }

            if (previewLooksBooting(iframeRef.current) || ! previewLooksLive(iframeRef.current)) return

            markFrameReady()

            if (data.type === 'inspect-cancel') {
                onInspectStop?.()
                return
            }

            if (data.type === 'inspect-select' && data.element) {
                setPicked(data.element)
                onInspectSelect?.(data.element)
                pinTargetRef.current?.({
                    element: data.element,
                    action: 'inspect',
                })
                return
            }

            if (data.type === 'context-close') {
                setContextMenu(null)
                postToPreview(iframeRef.current, { type: 'context-dismiss' })
                return
            }

            if (data.type === 'contextmenu' && data.element) {
                const frame = iframeRef.current?.getBoundingClientRect?.()
                setContextMenu({
                    element: data.element,
                    x: (frame?.left || 0) + (Number(data.x) || 0),
                    y: (frame?.top || 0) + (Number(data.y) || 0),
                })
                return
            }

            if (data.type === 'text-edit-commit' && data.element) {
                pinTargetRef.current?.({
                    element: {
                        ...data.element,
                        text: data.original ?? data.element.text,
                    },
                    action: 'change-text',
                    applied: { text: String(data.text ?? '') },
                })
                return
            }

            if (data.type !== 'location' || typeof data.path !== 'string') return
            if (missingPathRef.current) return

            const path = data.path || '/'
            const kind = data.kind
            const hist = histRef.current

            if (kind === 'push') {
                rememberPath(path)
                return
            }

            if (kind === 'pop') {
                if (hist.stack[hist.index - 1] === path) {
                    hist.index -= 1
                    setCurrentPath(path)
                    syncHistoryFlags()
                    return
                }
                if (hist.stack[hist.index + 1] === path) {
                    hist.index += 1
                    setCurrentPath(path)
                    syncHistoryFlags()
                    return
                }
            }

            rememberPath(path, { replace: true })
        }

        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [onInspectSelect, onInspectStop, rememberPath, remountAt, syncHistoryFlags, markFrameReady])

    const revealPath = useCallback((path, { remount = true } = {}) => {
        const next = path || '/'
        if (guestRouteKnown(routeTableRef.current, next)) {
            setMissingPath(null)
            if (remount) remountAt(next)
            return
        }
        setMissingPath(next)
    }, [remountAt])

    const navigate = useCallback((path, { replace = false } = {}) => {
        const next = path || '/'
        const known = guestRouteKnown(routeTableRef.current, next)
        rememberPath(next, { replace, catalog: known })
        if (! known) {
            setMissingPath(next)
            return
        }
        setMissingPath(null)
        if (frameReady && postToPreview(iframeRef.current, { type: 'navigate', path: next, replace })) {
            return
        }
        remountAt(next)
    }, [rememberPath, remountAt, frameReady])

    const handleBack = useCallback(() => {
        const wasMissing = Boolean(missingPathRef.current)
        if (! wasMissing && postToPreview(iframeRef.current, { type: 'back' })) return
        const hist = histRef.current
        if (hist.index <= 0) return
        hist.index -= 1
        const next = hist.stack[hist.index] || '/'
        setCurrentPath(next)
        syncHistoryFlags()
        revealPath(next, { remount: ! wasMissing })
    }, [revealPath, syncHistoryFlags])

    const handleForward = useCallback(() => {
        const wasMissing = Boolean(missingPathRef.current)
        if (! wasMissing && postToPreview(iframeRef.current, { type: 'forward' })) return
        const hist = histRef.current
        if (hist.index >= hist.stack.length - 1) return
        hist.index += 1
        const next = hist.stack[hist.index] || '/'
        setCurrentPath(next)
        syncHistoryFlags()
        revealPath(next, { remount: ! wasMissing })
    }, [revealPath, syncHistoryFlags])

    const handleReload = useCallback(() => {
        if (missingPathRef.current) return
        remountAt(pathRef.current)
    }, [remountAt])

    const handleHardReload = useCallback(() => {
        if (missingPathRef.current) return
        void (async () => {
            try {
                await pushLabPreview(
                    vfsContents && typeof vfsContents === 'object' ? vfsContents : {},
                    'hard-reload',
                )
            } catch {
                requestPreviewResync('hard-reload')
            }
        })()
    }, [vfsContents])

    const handleOpenExternal = useCallback(() => {
        const href = labPreviewHref(projectUuid, pathRef.current)
        if (href) {
            window.open(href, '_blank', 'noopener,noreferrer')
            return
        }
        const base = urlRef.current || getPreviewUrl()
        if (! base) return
        window.open(guestHref(base, pathRef.current), '_blank', 'noopener,noreferrer')
    }, [projectUuid])

    const handleCopyAddress = useCallback(async () => {
        const address = labPreviewHref(projectUuid, pathRef.current)
            || (urlRef.current ? guestHref(urlRef.current, pathRef.current) : `${host}${pathRef.current === '/' ? '/' : pathRef.current}`)
        try {
            await navigator.clipboard.writeText(address)
            setCopyFlash(true)
            window.setTimeout(() => setCopyFlash(false), 1200)
        } catch {
            /* clipboard may be denied */
        }
    }, [host, projectUuid])

    const pinTarget = useCallback((spec) => {
        if (! spec?.element) return
        onPinPreviewEdit?.(makeEditTarget(spec))
    }, [onPinPreviewEdit])
    pinTargetRef.current = pinTarget

    const closeContextMenu = useCallback(() => {
        setContextMenu(null)
        postToPreview(iframeRef.current, { type: 'context-dismiss' })
    }, [])

    const applyContext = useCallback((payload) => {
        postToPreview(iframeRef.current, {
            type: 'inspect-apply',
            styles: payload?.styles || {},
            text: payload?.text,
            attrs: payload?.attrs,
        })
    }, [])

    const labWorking = isAiStreaming || aiBusy || previewReloadPending
    const bucketActivity = resolvePreviewActivity({
        status: turnStatusLabel,
        thinking: thinkingLive,
        writing: aiWriting && (isAiStreaming || aiBusy),
        busy: aiBusy,
        streaming: isAiStreaming,
        healing,
        runtimePhase,
        previewReloadPending,
    })
    const bucketChip = {
        waiting: 'Waiting for model',
        thinking: 'Thinking',
        planning: 'Planning',
        writing: 'Writing code',
        reading: 'Reading',
        checking: 'Checking',
        repairing: 'Repairing',
        summarizing: 'Summarizing',
        installing: 'Installing',
        preview: 'Preview',
    }[bucketActivity] || 'Preview'

    const frameIsLive = frameReady && (live || port) && ! frameBlocked
    const statusLabel = copyFlash
        ? 'copied'
        : error || runtimePhase === 'error'
            ? 'error'
            : healing
                ? 'repairing'
                : aiWriting && (isAiStreaming || aiBusy)
                    ? 'writing'
                    : (isAiStreaming || aiBusy)
                        ? 'talking'
                        : previewReloadPending
                            ? 'reloading'
                            : frameIsLive
                                ? 'live'
                                : runtimePhase === 'install' || runtimePhase === 'install-done'
                                    ? 'installing'
                                    : runtimePhase === 'boot' || runtimePhase === 'dev' || runtimePhase === 'dev-running'
                                        ? 'starting'
                                        : runtimePhase === 'skip' || runtimePhase === 'dev-exit'
                                            ? ((status === 'live' && (live || port) && frameReady) ? 'live' : 'idle')
                                            : status === 'loading' || status === 'ready' || live || frameBlocked
                                                ? 'starting'
                                                : 'idle'

    const showIframe = Boolean(live && port && frameSrc && ! publishSuspended)
    const expectingPreview = live
        || frameBlocked
        || status === 'loading'
        || runtimePhase === 'boot'
        || runtimePhase === 'install'
        || runtimePhase === 'install-done'
        || runtimePhase === 'dev'
        || runtimePhase === 'dev-running'
    const previewWarming = expectingPreview && ! frameReady
    const coverPreview = previewWarming || labWorking
    const showBucket = ! missingPath && (coverPreview || ! showIframe)

    const inspectingRef = useRef(inspecting)
    inspectingRef.current = inspecting

    useEffect(() => {
        if (! inspectApplyRef) return undefined
        inspectApplyRef.current = (payload) => {
            postToPreview(iframeRef.current, {
                type: 'inspect-apply',
                styles: payload?.styles || {},
                text: payload?.text,
                attrs: payload?.attrs,
            })
        }
        return () => {
            if (inspectApplyRef.current) inspectApplyRef.current = null
        }
    }, [inspectApplyRef])

    const onIframeLoad = useCallback(() => {
        const iframe = iframeRef.current
        if (previewLooksBooting(iframe) || ! previewLooksLive(iframe)) {
            setFrameReady(false)
            if (previewLooksRefused(iframe) && refusedRetryRef.current < 12) {
                refusedRetryRef.current += 1
                setFrameBlocked(true)
                window.setTimeout(() => remountAt(pathRef.current), 280 * refusedRetryRef.current)
            }
            return
        }
        markFrameReady()
        if (inspectingRef.current) {
            postToPreview(iframe, {
                type: 'inspect-start',
                theme: readInspectTheme(),
            })
        }
    }, [markFrameReady, remountAt])

    // onLoad can miss (SW hang / Strict remount). Probe the guest document so
    // a stale boot/dev phase cannot pin the "Starting preview…" overlay.
    useEffect(() => {
        if (! showIframe || frameReady) return undefined

        let refusedQueued = false
        const probe = () => {
            const iframe = iframeRef.current
            if (! iframe) return false
            if (previewLooksBooting(iframe)) return false
            if (previewLooksRefused(iframe)) {
                if (! refusedQueued && refusedRetryRef.current < 12) {
                    refusedQueued = true
                    refusedRetryRef.current += 1
                    setFrameBlocked(true)
                    window.setTimeout(() => remountAt(pathRef.current), 280 * refusedRetryRef.current)
                }
                return false
            }
            if (! previewLooksLive(iframe)) return false
            markFrameReady()
            return true
        }

        if (probe()) return undefined
        const id = window.setInterval(probe, 400)
        return () => {
            window.clearInterval(id)
        }
    }, [showIframe, frameReady, iframeNonce, markFrameReady, remountAt])

    useEffect(() => {
        const onResync = () => {
            refusedRetryRef.current = 0
            guestPaintedRef.current = false
            setGuestPainted(false)
            setFrameReady(false)
            setFrameBlocked(true)
            remountAt(pathRef.current)
        }
        window.addEventListener(PREVIEW_RESYNC_EVENT, onResync)
        return () => window.removeEventListener(PREVIEW_RESYNC_EVENT, onResync)
    }, [remountAt])

    // Vite can die after a successful load (package.json restart). Keep watching.
    useEffect(() => {
        if (! showIframe || ! frameReady) return undefined
        const id = window.setInterval(() => {
            const iframe = iframeRef.current
            if (previewLooksBooting(iframe) || previewLooksHollow(iframe)) {
                if (previewLooksViteGuest(iframe)) return
                setFrameReady(false)
                setGuestPainted(false)
                return
            }
            if (! previewLooksRefused(iframe)) return
            setFrameReady(false)
            setFrameBlocked(true)
            if (refusedRetryRef.current >= 12) return
            refusedRetryRef.current += 1
            remountAt(pathRef.current)
        }, 900)
        return () => window.clearInterval(id)
    }, [showIframe, frameReady, remountAt])

    // Start/stop picker in the live iframe — never remount the preview.
    useEffect(() => {
        if (! showIframe) return undefined
        if (! inspecting) {
            setPicked(null)
            postToPreview(iframeRef.current, { type: 'inspect-stop' })
            return undefined
        }

        let acked = false
        let tries = 0
        const send = () => {
            postToPreview(iframeRef.current, {
                type: 'inspect-start',
                theme: readInspectTheme(),
            })
        }
        const onAck = (event) => {
            const data = event?.data
            if (isPreviewChromeMessage(data) && data.type === 'inspect-state' && data.active) {
                acked = true
            }
        }
        window.addEventListener('message', onAck)
        send()
        const id = window.setInterval(() => {
            if (acked || ++tries > 10) {
                window.clearInterval(id)
                return
            }
            send()
        }, 80)

        return () => {
            window.removeEventListener('message', onAck)
            window.clearInterval(id)
        }
    }, [inspecting, showIframe])

    const externalHref = projectUuid
        ? labPreviewHref(projectUuid, currentPath)
        : null

    useEffect(() => {
        if (! projectUuid || ! url) return undefined
        const publish = () => publishPreviewTunnel(projectUuid, {
            url,
            path: pathRef.current || '/',
            port,
        })
        publish()
        return listenPreviewTunnelClients(projectUuid, {
            onHello: publish,
            onAskLab: (prompt) => onAskLab?.(prompt),
            onPinTarget: (target) => onPinPreviewEdit?.(target),
        })
    }, [projectUuid, url, port, currentPath, onAskLab, onPinPreviewEdit])

    const coverEnabled = Boolean(
        visible
        && projectUuid
        && frameReady
        && guestPainted
        && showIframe
        && ! labWorking
        && ! missingPath
        && ! inspecting
        && ! healing
        && ! frameBlocked,
    )
    usePreviewCover({
        iframeRef,
        projectUuid,
        enabled: coverEnabled,
        paintKey: projectUuid,
    })

    return (
        <div className="relative flex h-full min-h-0 flex-col bg-krikkit-canvas" aria-label={projectTitle}>
            <PreviewChrome
                pages={pages}
                currentPath={currentPath.split('?')[0].split('#')[0] || '/'}
                canBack={canBack}
                canForward={canForward}
                statusLabel={statusLabel}
                viewportId={viewportId}
                host={host}
                onBack={handleBack}
                onForward={handleForward}
                onReload={handleReload}
                onNavigate={navigate}
                onSelectPage={(path) => navigate(path)}
                onCycleViewport={() => setViewportId((id) => nextViewportId(id))}
                onOpenExternal={externalHref ? handleOpenExternal : undefined}
                showExternalOpen={Boolean(externalHref)}
                externalHref={externalHref}
                onCopyAddress={handleCopyAddress}
                onHardReload={handleHardReload}
            />

            <div className="relative min-h-0 flex-1 overflow-hidden bg-krikkit-canvas">
                <div
                    className="relative mx-auto h-full overflow-hidden bg-krikkit-canvas transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ maxWidth: width ? `${width}px` : '100%' }}
                >
                    {showIframe ? (
                        <iframe
                            key={`preview:${iframeNonce}`}
                            ref={iframeRef}
                            title={projectTitle}
                            className={[
                                'h-full min-h-0 w-full border-0 bg-krikkit-surface',
                                missingPath || coverPreview ? 'invisible' : '',
                            ].join(' ')}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                            allow="cross-origin-isolated"
                            src={frameSrc}
                            onLoad={onIframeLoad}
                        />
                    ) : (
                        <div className="h-full min-h-0 bg-krikkit-canvas" aria-label="Preview" />
                    )}
                    {showBucket ? (
                        <div
                            className="absolute inset-0 flex items-center justify-center bg-krikkit-canvas"
                            aria-label={bucketChip}
                        >
                            <PreviewBucket activity={bucketActivity} />
                        </div>
                    ) : null}
                    {missingPath ? (
                        <PreviewMissing path={missingPath} onHome={() => navigate('/')} />
                    ) : null}
                </div>

                {inspecting && ! picked ? (
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-2">
                        <span className="rounded-full border border-krikkit-line bg-krikkit-surface px-3 py-1 text-[11px] text-krikkit-muted">
                            Click an element
                        </span>
                    </div>
                ) : null}
            </div>

            <PreviewContextMenu
                open={Boolean(contextMenu)}
                x={contextMenu?.x || 0}
                y={contextMenu?.y || 0}
                element={contextMenu?.element || null}
                onClose={closeContextMenu}
                onApply={applyContext}
                onInspect={(el) => {
                    closeContextMenu()
                    setPicked(el)
                    onStartInspect?.(el)
                }}
                onPin={(spec) => {
                    closeContextMenu()
                    pinTarget(spec)
                }}
                onEditText={() => {
                    closeContextMenu()
                    postToPreview(iframeRef.current, {
                        type: 'text-edit-start',
                        theme: readInspectTheme(),
                    })
                }}
            />
        </div>
    )
}
