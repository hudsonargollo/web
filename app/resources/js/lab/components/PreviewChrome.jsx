import { useEffect, useMemo, useRef, useState } from 'react'
import {
    ArrowRight,
    Check,
    ChevronDown,
    ExternalLink,
    Monitor,
    MoreHorizontal,
    Search,
    Smartphone,
    Tablet,
} from 'lucide-react'

const VIEWPORTS = [
    { id: 'desktop', label: 'Desktop', width: null },
    { id: 'tablet', label: 'Tablet', width: 768 },
    { id: 'mobile', label: 'Mobile', width: 390 },
]

function ChromeIconButton({
    label,
    disabled = false,
    active = false,
    onClick,
    children,
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={[
                'inline-flex h-6 w-6 shrink-0 items-center justify-center text-krikkit-muted transition-colors',
                'hover:text-krikkit-fg',
                'disabled:pointer-events-none disabled:opacity-30',
                active ? 'text-krikkit-fg' : '',
            ].join(' ')}
        >
            {children}
        </button>
    )
}

function ViewportGlyph({ id, className = 'size-3.5' }) {
    const Icon = id === 'mobile' ? Smartphone : id === 'tablet' ? Tablet : Monitor
    return <Icon className={className} strokeWidth={1.75} aria-hidden />
}

function IconBack({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.5 6.5 9 12l5.5 5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconForward({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9.5 6.5 15 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconReload({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M19.5 12a7.5 7.5 0 1 1-2.1-5.2M19.5 5v4.5H15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function PillPath({ path, label, reveal = false }) {
    const isHome = ! path || path === '/'
    const leaf = label || (isHome ? 'Homepage' : (path.split('/').filter(Boolean).pop() || 'Page'))

    return (
        <span className="inline-flex min-w-0 items-center text-xs">
            <span
                className={[
                    'inline-block overflow-hidden whitespace-nowrap text-krikkit-subtle transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    reveal
                        ? 'max-w-4 translate-x-0 opacity-100'
                        : 'max-w-0 -translate-x-1.5 opacity-0',
                    'group-hover/path:max-w-4 group-hover/path:translate-x-0 group-hover/path:opacity-100',
                ].join(' ')}
                aria-hidden
            >
                {isHome ? '/' : '/ '}
            </span>
            <span
                className={[
                    'min-w-0 truncate text-krikkit-fg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isHome
                        ? (reveal
                            ? 'max-w-0 opacity-0'
                            : 'max-w-[12rem] opacity-100 group-hover/path:max-w-0 group-hover/path:opacity-0')
                        : 'opacity-100',
                ].join(' ')}
            >
                {leaf}
            </span>
        </span>
    )
}

/**
 * Compact pill chrome for the Lab site preview — Krikkit tokens, no shadows.
 */
export function PreviewChrome({
    pages = [],
    currentPath = '/',
    canBack = false,
    canForward = false,
    statusLabel = 'live',
    viewportId = 'desktop',
    host = 'preview.lab',
    onBack,
    onForward,
    onReload,
    onNavigate,
    onSelectPage,
    onCycleViewport,
    onOpenExternal,
    showExternalOpen = true,
    externalHref = null,
    onCopyAddress,
    onHardReload,
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [toolsOpen, setToolsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [displayLabel, setDisplayLabel] = useState(statusLabel)
    const [statusExpanded, setStatusExpanded] = useState(true)
    const [labelOpaque, setLabelOpaque] = useState(true)
    const menuRef = useRef(null)
    const toolsRef = useRef(null)
    const searchRef = useRef(null)
    const swapTimerRef = useRef(0)
    const expandedRef = useRef(true)

    const catalog = pages.length ? pages : [{ id: '/', label: 'Homepage', path: '/' }]
    const activePage = useMemo(() => {
        return pages.find((page) => page.path === currentPath)
            || { label: labelFromPath(currentPath), path: currentPath }
    }, [pages, currentPath])

    const viewport = VIEWPORTS.find((item) => item.id === viewportId) || VIEWPORTS[0]
    const statusKind = statusTone(displayLabel)
    const statusSettles = statusKind === 'live' || statusKind === 'paused' || statusKind === 'idle'
    const labelReady = displayLabel === statusLabel && labelOpaque

    const needle = query.trim().toLowerCase()
    const visiblePages = catalog.filter((page) => {
        if (! needle) return true
        return page.label.toLowerCase().includes(needle) || page.path.toLowerCase().includes(needle)
    })
    const goToPath = normalizeDraft(query)
    const showGoTo = Boolean(needle) && ! catalog.some((page) => page.path === goToPath)

    useEffect(() => {
        expandedRef.current = statusExpanded
    }, [statusExpanded])

    useEffect(() => {
        if (! menuOpen) return undefined
        setQuery('')
        const timer = window.setTimeout(() => searchRef.current?.focus(), 20)
        return () => window.clearTimeout(timer)
    }, [menuOpen])

    useEffect(() => {
        if (statusLabel === displayLabel) return undefined

        window.clearTimeout(swapTimerRef.current)
        const wasExpanded = expandedRef.current
        setStatusExpanded(true)
        expandedRef.current = true

        if (! wasExpanded) {
            setDisplayLabel(statusLabel)
            setLabelOpaque(false)
            swapTimerRef.current = window.setTimeout(() => setLabelOpaque(true), 20)
            return () => window.clearTimeout(swapTimerRef.current)
        }

        setLabelOpaque(false)
        swapTimerRef.current = window.setTimeout(() => {
            setDisplayLabel(statusLabel)
            setLabelOpaque(true)
        }, 160)

        return () => window.clearTimeout(swapTimerRef.current)
    }, [statusLabel, displayLabel])

    useEffect(() => {
        if (! labelReady || ! statusSettles) return undefined
        const timer = window.setTimeout(() => setStatusExpanded(false), 1100)
        return () => window.clearTimeout(timer)
    }, [labelReady, statusSettles, displayLabel])

    useEffect(() => {
        if (! menuOpen && ! toolsOpen) return undefined
        const onKey = (event) => {
            if (event.key === 'Escape') {
                setMenuOpen(false)
                setToolsOpen(false)
            }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [menuOpen, toolsOpen])

    const closeOverlays = () => {
        setMenuOpen(false)
        setToolsOpen(false)
    }

    const go = (path) => {
        closeOverlays()
        ;(onSelectPage || onNavigate)?.(path)
    }

    const submitSearch = (event) => {
        event.preventDefault()
        if (showGoTo) {
            go(goToPath)
            return
        }
        if (visiblePages[0]) go(visiblePages[0].path)
    }

    return (
        <div className="relative flex h-10 shrink-0 items-center gap-1.5 border-b border-krikkit-line bg-krikkit-canvas px-3">
            {(menuOpen || toolsOpen) && (
                <button
                    type="button"
                    aria-label="Close menu"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={closeOverlays}
                />
            )}

            <div className="flex shrink-0 items-center gap-0.5">
                <ChromeIconButton label="Back" disabled={! canBack} onClick={onBack}>
                    <IconBack />
                </ChromeIconButton>
                <ChromeIconButton label="Forward" disabled={! canForward} onClick={onForward}>
                    <IconForward />
                </ChromeIconButton>
                <ChromeIconButton label="Reload" onClick={onReload}>
                    <IconReload />
                </ChromeIconButton>
            </div>

            <div className="flex min-w-0 flex-1 justify-center px-2">
                <div className="relative w-84  max-w-full" ref={menuRef}>
                    <button
                        type="button"
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        title={currentPath || '/'}
                        onClick={() => {
                            setToolsOpen(false)
                            setMenuOpen((open) => ! open)
                        }}
                        className={[
                            'group/path flex h-7 w-full items-center gap-2 rounded-lg border px-2.5 text-left transition-colors',
                            menuOpen
                                ? 'border-krikkit-fg text-krikkit-fg'
                                : 'border-krikkit-line text-krikkit-muted hover:border-krikkit-fg/40 hover:text-krikkit-fg',
                        ].join(' ')}
                    >
                        <PillPath path={currentPath} label={activePage.label} reveal={menuOpen} />
                        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5">
                            <span
                                className="lab-status inline-flex h-4 items-center justify-end"
                                title={statusLabel}
                                aria-label={statusLabel}
                            >
                                <span
                                    className={[
                                        'lab-status-label overflow-hidden whitespace-nowrap text-[10px] tabular-nums text-krikkit-subtle',
                                        statusExpanded
                                            ? 'lab-status-label--open'
                                            : 'lab-status-label--closed',
                                        labelOpaque
                                            ? 'lab-status-label--opaque'
                                            : 'lab-status-label--faded',
                                    ].join(' ')}
                                >
                                    {displayLabel}
                                </span>
                                <span
                                    className={[
                                        'inline-block size-1.5 shrink-0 rounded-full transition-[background-color] duration-300',
                                        {
                                            live: 'bg-emerald-500',
                                            busy: 'bg-amber-500',
                                            error: 'bg-red-500',
                                            paused: 'bg-krikkit-subtle',
                                            idle: 'bg-krikkit-subtle',
                                        }[statusKind] || 'bg-krikkit-subtle',
                                    ].join(' ')}
                                    aria-hidden
                                />
                            </span>
                            <ChevronDown
                                className={[
                                    'size-3.5 text-krikkit-subtle transition-transform',
                                    menuOpen ? 'rotate-180' : '',
                                ].join(' ')}
                                strokeWidth={1.75}
                            />
                        </span>
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-krikkit-line bg-krikkit-surface"
                        >
                            <form onSubmit={submitSearch} className="flex items-center gap-2 px-3 py-2">
                                <Search className="size-3.5 shrink-0 text-krikkit-subtle" strokeWidth={1.75} />
                                <input
                                    ref={searchRef}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    spellCheck={false}
                                    aria-label="Find page or enter path"
                                    placeholder="Find page or enter path"
                                    className="min-w-0 flex-1 bg-transparent text-xs text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                                />
                            </form>
                            <div className="border-t border-krikkit-line p-1">
                                {visiblePages.map((page) => {
                                    const active = page.path === currentPath
                                    return (
                                        <button
                                            key={page.id}
                                            type="button"
                                            role="menuitem"
                                            onClick={() => go(page.path)}
                                            className={[
                                                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition',
                                                active
                                                    ? 'bg-krikkit-soft text-krikkit-fg'
                                                    : 'text-krikkit-muted hover:bg-krikkit-soft hover:text-krikkit-fg',
                                            ].join(' ')}
                                        >
                                            <span className="inline-flex w-3.5 shrink-0 justify-center">
                                                {active ? <Check className="size-3.5" strokeWidth={2} /> : null}
                                            </span>
                                            <span className="min-w-0 truncate font-medium">{page.path}</span>
                                        </button>
                                    )
                                })}
                                {showGoTo && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => go(goToPath)}
                                        className="flex w-full items-center gap-2 rounded-lg bg-krikkit-soft px-2 py-1.5 text-left text-xs text-krikkit-fg"
                                    >
                                        <ArrowRight className="size-3.5 shrink-0 text-krikkit-subtle" strokeWidth={1.75} />
                                        <span className="min-w-0 truncate">
                                            <span className="text-krikkit-subtle">Go to </span>
                                            <span className="font-medium">{query.trim()}</span>
                                        </span>
                                    </button>
                                )}
                                {! visiblePages.length && ! showGoTo && (
                                    <p className="px-2 py-1.5 text-xs text-krikkit-subtle">No pages</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-0.5">
                <ChromeIconButton
                    label={`Viewport: ${viewport.label}`}
                    active={viewportId !== 'desktop'}
                    onClick={onCycleViewport}
                >
                    <ViewportGlyph id={viewportId} />
                </ChromeIconButton>

                {showExternalOpen && (externalHref || onOpenExternal) ? (
                    externalHref ? (
                        <a
                            href={externalHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                            aria-label="Open in new tab"
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-krikkit-muted transition-colors hover:text-krikkit-fg"
                        >
                            <ExternalLink className="size-3.5" strokeWidth={1.75} />
                        </a>
                    ) : (
                        <ChromeIconButton label="Open in new tab" onClick={onOpenExternal}>
                            <ExternalLink className="size-3.5" strokeWidth={1.75} />
                        </ChromeIconButton>
                    )
                ) : null}

                <div className="relative" ref={toolsRef}>
                    <ChromeIconButton
                        label="More"
                        active={toolsOpen}
                        onClick={() => {
                            setMenuOpen(false)
                            setToolsOpen((open) => ! open)
                        }}
                    >
                        <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
                    </ChromeIconButton>
                    {toolsOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-krikkit-line bg-krikkit-surface p-1.5"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                className="block w-full rounded-lg px-2 py-1.5 text-left text-[13px] text-krikkit-fg transition hover:bg-krikkit-soft"
                                onClick={() => {
                                    setToolsOpen(false)
                                    onCopyAddress?.()
                                }}
                            >
                                Copy address
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                className="block w-full rounded-lg px-2 py-1.5 text-left text-[13px] text-krikkit-fg transition hover:bg-krikkit-soft"
                                onClick={() => {
                                    setToolsOpen(false)
                                    onHardReload?.()
                                }}
                            >
                                Hard reload
                            </button>
                            <p className="mx-1.5 mt-1 border-t border-krikkit-line px-0.5 pt-1.5 text-[10px] text-krikkit-subtle">
                                {viewport.label}
                                {viewport.width ? ` · ${viewport.width}px` : ' · fluid'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export function viewportWidthFor(id) {
    return VIEWPORTS.find((item) => item.id === id)?.width ?? null
}

export function nextViewportId(id) {
    const index = VIEWPORTS.findIndex((item) => item.id === id)
    return VIEWPORTS[(index + 1) % VIEWPORTS.length].id
}

function normalizeDraft(value) {
    const raw = String(value || '').trim()
    if (! raw || raw === '/') return '/'
    let next = raw
        .replace(/^https?:\/\//i, '')
        .replace(/^[a-z0-9-]+\.lab(?=\/|$)/i, '')
        .replace(/^preview\.lab(?=\/|$)/i, '')
        .replace(/^(?:localhost|127\.0\.0\.1):\d+(?=\/|$)/i, '')
    if (! next.startsWith('/')) next = `/${next}`
    return next.length > 1 && next.endsWith('/') ? next.slice(0, -1) : next
}

export function labelFromPath(path) {
    if (! path || path === '/') return 'Homepage'
    const leaf = path.split('/').filter(Boolean).pop() || 'Page'
    return leaf.replace(/[-_]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function statusTone(label) {
    const s = String(label || '').toLowerCase()
    if (s === 'live' || s === 'copied') return 'live'
    if (s.includes('error')) return 'error'
    if (s.includes('paused')) return 'paused'
    if (
        s.includes('build')
        || s.includes('updat')
        || s.includes('stream')
        || s.includes('start')
        || s.includes('install')
        || s.includes('repair')
        || s.includes('heal')
        || s.includes('writ')
        || s.includes('talk')
        || s.includes('reload')
        || s === 'running'
    ) {
        return 'busy'
    }
    return 'idle'
}
