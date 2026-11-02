import { useCallback, useEffect, useRef, useState } from 'react'
import {
    isPreviewChromeMessage,
    postToPreview,
} from '../lib/previewChromeBridge'
import { dispatchPreviewGuestError, isIgnorableGuestRuntimeError } from '../lib/previewGuestErrors'
import { guestHref, labPreviewPath, normalizeGuestPath } from '../lib/labPreviewUrl'
import { makeEditTarget } from '../lib/previewEditTargets'
import { previewLooksBooting, previewLooksLive } from '../lib/previewProbe'
import { openWorkspaceForHandoff, subscribePreviewTunnel } from '../lib/previewTunnel'
import { PreviewContextMenu } from '../components/PreviewContextMenu'
import { LabGlyph } from '../components/Icons'

function readBootstrap() {
    const node = document.getElementById('lab-preview-bootstrap')
    const raw = node?.textContent?.trim()
    if (! raw || raw === 'null') return {}
    try {
        return JSON.parse(raw) || {}
    } catch {
        return {}
    }
}

export function PreviewApp() {
    const boot = useRef(readBootstrap()).current
    const uuid = boot.uuid || null
    const workspaceUrl = boot.workspaceUrl || (uuid ? `/lab/${uuid}/workspace` : '/lab')
    const iframeRef = useRef(null)
    const [title] = useState(boot.title || 'Preview')
    const [guestPath, setGuestPath] = useState(() => normalizeGuestPath(boot.path || '/'))
    const [tunnelUrl, setTunnelUrl] = useState(null)
    const [status, setStatus] = useState('waiting')
    const [frameReady, setFrameReady] = useState(false)
    const [contextMenu, setContextMenu] = useState(null)
    const [pinFlash, setPinFlash] = useState(null)

    const frameSrc = tunnelUrl ? guestHref(tunnelUrl, guestPath) : null

    const syncFrameReady = useCallback(() => {
        const iframe = iframeRef.current
        if (! iframe) return
        if (previewLooksBooting(iframe) || ! previewLooksLive(iframe)) {
            setFrameReady(false)
            return
        }
        setFrameReady(true)
    }, [])

    const onPin = useCallback((spec) => {
        const target = makeEditTarget(spec)
        const ok = openWorkspaceForHandoff(uuid, workspaceUrl, {
            mode: spec?.action === 'inspect' ? 'inspect' : 'edit',
            target,
        })
        setPinFlash(ok
            ? (spec?.action === 'inspect'
                ? 'Inspect is ready in the Lab workspace.'
                : 'Composer is ready in the Lab workspace.')
            : 'Allow pop-ups to open the Lab workspace.')
        window.setTimeout(() => setPinFlash(null), 2400)
    }, [uuid, workspaceUrl])

    useEffect(() => {
        if (! uuid) {
            setStatus('missing')
            return undefined
        }
        return subscribePreviewTunnel(uuid, (msg) => {
            if (msg?.type === 'tunnel-closed') {
                setTunnelUrl(null)
                setFrameReady(false)
                setStatus('waiting')
                return
            }
            if (msg?.type === 'tunnel' && msg.url) {
                setTunnelUrl(msg.url)
                setFrameReady(false)
                setStatus('live')
            }
        })
    }, [uuid])

    useEffect(() => {
        const path = labPreviewPath(uuid, guestPath)
        if (! path) return
        const next = `${window.location.origin}${path}`
        if (window.location.href !== next) {
            window.history.replaceState(window.history.state, '', path)
        }
    }, [uuid, guestPath])

    useEffect(() => {
        if (! frameSrc || frameReady) return undefined
        const id = window.setInterval(syncFrameReady, 1000)
        return () => window.clearInterval(id)
    }, [frameSrc, frameReady, syncFrameReady])

    useEffect(() => {
        const onMessage = (event) => {
            const data = event?.data
            if (! isPreviewChromeMessage(data)) return
            if (data.type === 'location' && typeof data.path === 'string') {
                setGuestPath(normalizeGuestPath(data.path))
                if (data.kind === 'init') {
                    if (! previewLooksBooting(iframeRef.current)) setFrameReady(true)
                }
                return
            }
            if (data.type === 'need-reload') {
                const iframe = iframeRef.current
                if (iframe && tunnelUrl) {
                    iframe.src = guestHref(tunnelUrl, data.path || guestPath)
                }
                return
            }
            if (data.type === 'context-close') {
                setContextMenu(null)
                postToPreview(iframeRef.current, { type: 'context-dismiss' })
                return
            }

            if (data.type === 'guest-console-error') {
                dispatchPreviewGuestError({
                    message: data.message,
                    stack: data.stack,
                    file: data.file,
                    line: data.line,
                    component: data.component,
                })
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
                onPin({
                    element: {
                        ...data.element,
                        text: data.original ?? data.element.text,
                    },
                    action: 'change-text',
                    applied: { text: String(data.text ?? '') },
                })
            }
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [guestPath, tunnelUrl, onPin])

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

    return (
        <div className="flex h-dvh flex-col bg-krikkit-canvas">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-krikkit-line px-4">
                <a
                    href={workspaceUrl}
                    className="inline-flex h-5 items-center truncate text-sm font-semibold leading-none tracking-tight text-krikkit-fg hover:text-accent-content"
                >
                    Krikkit
                </a>
                <span className="text-krikkit-subtle" aria-hidden>/</span>
                <a href={workspaceUrl} className="inline-flex h-5 items-center gap-1.5 text-sm font-medium leading-none text-krikkit-fg hover:text-accent-content">
                    <LabGlyph />
                    Lab
                </a>
                <span className="text-krikkit-subtle" aria-hidden>/</span>
                <span className="min-w-0 truncate text-sm text-krikkit-muted">{title}</span>
                <span className="ml-auto inline-flex items-center gap-2">
                    <span className="rounded-full border border-krikkit-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-krikkit-subtle">
                        Private
                    </span>
                    <a
                        href={workspaceUrl}
                        className="text-xs text-krikkit-muted transition-colors hover:text-krikkit-fg"
                    >
                        Workspace
                    </a>
                </span>
            </header>

            <div className="relative min-h-0 flex-1 bg-krikkit-canvas">
                {frameSrc ? (
                    <iframe
                        ref={iframeRef}
                        title={title}
                        className={[
                            'h-full min-h-0 w-full border-0 bg-krikkit-surface',
                            frameReady ? '' : 'invisible',
                        ].join(' ')}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                        allow="cross-origin-isolated"
                        src={frameSrc}
                        onLoad={syncFrameReady}
                    />
                ) : null}

                {! frameSrc || ! frameReady ? (
                    <div className="absolute inset-0 flex h-full flex-col items-center justify-center gap-3 bg-krikkit-canvas px-6 text-center">
                        <p className="text-sm font-medium text-krikkit-fg">
                            {status === 'missing' ? 'Preview is unavailable.' : 'Waiting for the Lab workspace…'}
                        </p>
                        <p className="max-w-sm text-sm text-krikkit-muted">
                            This preview is private. Keep the workspace tab open so the in-browser dev server can stream here.
                        </p>
                        <a
                            href={workspaceUrl}
                            className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground"
                        >
                            Open workspace
                        </a>
                    </div>
                ) : null}

                {pinFlash ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
                        <span className="rounded-full border border-krikkit-line bg-krikkit-surface px-3 py-1.5 text-[12px] text-krikkit-muted">
                            {pinFlash}
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
                onInspect={(element) => {
                    closeContextMenu()
                    onPin({ element, action: 'inspect' })
                }}
                onPin={onPin}
                onEditText={(element) => {
                    closeContextMenu()
                    onPin({ element, action: 'change-text' })
                }}
            />
        </div>
    )
}
