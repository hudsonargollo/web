import { useCallback, useEffect, useRef, useState } from 'react'
import { IconClose } from './Icons'

const IS_APPLE = typeof navigator !== 'undefined'
    && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '')

const MOD = IS_APPLE ? '⌘' : 'Ctrl+'

/** @type {Array<{ id: string, label: string, shortcut: string, icon: string, group: string }>} */
const PLUS_MENU = [
    { id: 'files', label: 'Files', shortcut: `${MOD}⇧E`, icon: 'folder', group: 'open' },
    { id: 'console', label: 'Console', shortcut: `${MOD}\``, icon: 'console', group: 'open' },
    { id: 'new-file', label: 'New file', shortcut: `${MOD}N`, icon: 'new-file', group: 'file' },
    { id: 'find-file', label: 'Find file', shortcut: `${MOD}P`, icon: 'search', group: 'file' },
    { id: 'recently-opened', label: 'Recently opened', shortcut: `${MOD}E`, icon: 'history', group: 'file' },
    { id: 'supabase', label: 'Supabase', shortcut: '', icon: 'datastore', group: 'connect' },
    { id: 'app-settings', label: 'App settings', shortcut: `${MOD},`, icon: 'settings', group: 'prefs' },
]

function plusMenuGroups(items) {
    const groups = []
    for (const entry of items) {
        const last = groups[groups.length - 1]
        if (! last || last.id !== entry.group) {
            groups.push({ id: entry.group, items: [entry] })
        } else {
            last.items.push(entry)
        }
    }
    return groups
}

function IconMonitor({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
                x="3.75"
                y="4.75"
                width="16.5"
                height="11.5"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.75"
            />
            <path
                d="M8 19.25h8M12 16.25v3"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    )
}

function IconPlus({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    )
}

function MenuIcon({ name, className = 'h-4 w-4' }) {
    const common = {
        className,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': true,
    }

    switch (name) {
        case 'console':
            return (
                <svg {...common}>
                    <path
                        d="M5 7.5 9.5 12 5 16.5M12.5 16.5H19"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        case 'new-file':
            return (
                <svg {...common}>
                    <path
                        d="M8 3.75h5.5L18.25 8.5V19.5a.75.75 0 0 1-.75.75H8a.75.75 0 0 1-.75-.75V4.5A.75.75 0 0 1 8 3.75Z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M13.25 3.75V8.5h4.75M12 12v5M9.5 14.5H14.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        case 'search':
            return (
                <svg {...common}>
                    <circle cx="11" cy="11" r="5.25" stroke="currentColor" strokeWidth="1.75" />
                    <path d="m15.5 15.5 3.75 3.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
            )
        case 'folder':
            return (
                <svg {...common}>
                    <path
                        d="M3.75 8.25A1.5 1.5 0 0 1 5.25 6.75h4.1l1.8 1.8h7.6a1.5 1.5 0 0 1 1.5 1.5v7.2a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25Z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        case 'history':
            return (
                <svg {...common}>
                    <path
                        d="M5.5 12a6.5 6.5 0 1 0 1.9-4.6M5.5 5.5v3.2h3.2"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M12 8.5V12l2.5 1.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )
        case 'settings':
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
                    <path
                        d="M12 3.75v1.8M12 18.45v1.8M4.94 6.44l1.27 1.27M17.79 16.29l1.27 1.27M3.75 12h1.8M18.45 12h1.8M4.94 17.56l1.27-1.27M17.79 7.71l1.27-1.27"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                    />
                </svg>
            )
        case 'datastore':
            return (
                <svg {...common}>
                    <ellipse cx="12" cy="6.5" rx="7.25" ry="2.75" stroke="currentColor" strokeWidth="1.5" />
                    <path
                        d="M4.75 6.5v11c0 1.52 3.24 2.75 7.25 2.75s7.25-1.23 7.25-2.75v-11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                </svg>
            )
        default:
            return null
    }
}

function truncateLabel(label, max = 14) {
    if (label.length <= max) return label
    return `${label.slice(0, max - 1)}…`
}

function panelForTab(tab) {
    if (! tab) return 'preview'
    if (tab.panel) return tab.panel
    const key = tab.label.toLowerCase()
    if (key === 'console') return 'console'
    if (key === 'files') return 'files'
    if (key === 'app settings') return 'app-settings'
    if (key === 'supabase') return 'tables'
    if (key === 'tables') return 'tables'
    if (key === 'find file') return 'find-file'
    if (key === 'recently opened') return 'recently-opened'
    return 'editor'
}

function tabIconName(tab) {
    const panel = tab.panel || panelForTab(tab)
    if (panel === 'console') return 'console'
    if (panel === 'files') return 'folder'
    if (panel === 'find-file') return 'search'
    if (panel === 'recently-opened') return 'history'
    if (panel === 'app-settings') return 'settings'
    if (panel === 'tables') return 'datastore'
    if (panel === 'editor') return 'file'
    return 'file'
}

function TabGlyph({ name, className = 'h-3.5 w-3.5' }) {
    if (name === 'file') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                    d="M8 3.75h5.5L18.25 8.5V19.5a.75.75 0 0 1-.75.75H8a.75.75 0 0 1-.75-.75V4.5A.75.75 0 0 1 8 3.75Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                />
                <path
                    d="M13.25 3.75V8.5h4.75"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                />
            </svg>
        )
    }

    return <MenuIcon name={name} className={className} />
}

const FILES_TAB_ID = 'tab-files-pinned'
const FILES_TAB = Object.freeze({
    id: FILES_TAB_ID,
    label: 'Files',
    tone: 'sky',
    panel: 'files',
    path: null,
    pinned: true,
})

function isPinnedTab(tab) {
    return Boolean(tab?.pinned || tab?.id === FILES_TAB_ID || tab?.panel === 'files')
}

/**
 * Cursor-style workspace tab strip.
 */
export function WorkspaceTabs({
    onPanelChange,
    openFileSignal = null,
    openConsoleSignal = null,
    openPreviewSignal = null,
    openTablesSignal = null,
    dirtyPaths = {},
    onRequestCloseTab = null,
    onWorkspaceCommand = null,
}) {
    const [previewOn, setPreviewOn] = useState(true)
    const [tabs, setTabs] = useState(() => [{ ...FILES_TAB }])
    const [activeId, setActiveId] = useState(FILES_TAB_ID)
    const [menuOpen, setMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
    const menuRef = useRef(null)
    const plusBtnRef = useRef(null)
    const tabsScrollRef = useRef(null)
    const onPanelChangeRef = useRef(onPanelChange)
    onPanelChangeRef.current = onPanelChange

    const placeMenu = useCallback(() => {
        const btn = plusBtnRef.current
        if (! btn) return

        const rect = btn.getBoundingClientRect()
        const menuEl = menuRef.current
        const pad = 8
        const menuW = menuEl?.offsetWidth || 320
        const menuH = menuEl?.offsetHeight || 280
        const vw = window.innerWidth
        const vh = window.innerHeight

        let left = rect.left
        if (left + menuW > vw - pad) {
            left = rect.right - menuW
        }
        left = Math.min(Math.max(pad, left), Math.max(pad, vw - menuW - pad))

        let top = rect.bottom + 4
        if (top + menuH > vh - pad) {
            top = rect.top - menuH - 4
        }
        top = Math.min(Math.max(pad, top), Math.max(pad, vh - menuH - pad))

        setMenuPos({ top, left })
    }, [])

    const emitPanel = useCallback((nextPreview, nextTabs, nextActiveId) => {
        if (nextPreview) {
            onPanelChangeRef.current?.({
                panel: 'preview',
                tabId: null,
                consoleIds: nextTabs.filter((t) => t.panel === 'console').map((t) => t.id),
                editorPaths: nextTabs.filter((t) => t.panel === 'editor' && t.path).map((t) => t.path),
                activePath: null,
            })
            return
        }
        const tab = nextTabs.find((t) => t.id === nextActiveId)
        onPanelChangeRef.current?.({
            panel: panelForTab(tab),
            tabId: nextActiveId,
            consoleIds: nextTabs.filter((t) => t.panel === 'console').map((t) => t.id),
            editorPaths: nextTabs.filter((t) => t.panel === 'editor' && t.path).map((t) => t.path),
            activePath: tab?.path ?? null,
        })
    }, [])

    useEffect(() => {
        emitPanel(previewOn, tabs, activeId)
    }, [previewOn, activeId, tabs, emitPanel])

    // Keep + (and the newest tab) in view when the strip overflows.
    useEffect(() => {
        const scroller = tabsScrollRef.current
        const plus = plusBtnRef.current
        if (! scroller || ! plus) return
        requestAnimationFrame(() => {
            plus.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
        })
    }, [tabs, activeId])

    const openMenu = () => {
        placeMenu()
        setMenuOpen(true)
    }

    const toggleMenu = () => {
        if (menuOpen) {
            setMenuOpen(false)
            return
        }
        openMenu()
    }

    const ensureConsoleTab = useCallback(() => {
        setTabs((list) => {
            const existing = list.find((t) => t.panel === 'console')
            if (existing) return list
            const id = `tab-console-${Date.now().toString(36)}`
            const pinned = list.filter(isPinnedTab)
            const rest = list.filter((t) => ! isPinnedTab(t))
            return [...pinned, ...rest, {
                id,
                label: 'Console',
                tone: 'emerald',
                panel: 'console',
            }]
        })
    }, [])

    const openTab = useCallback((label, tone = 'violet', panel = null, { unique = false, path = null } = {}) => {
        setPreviewOn(false)
        setTabs((list) => {
            // Files is always mounted — just focus it.
            if (panel === 'files') {
                const files = list.find((t) => isPinnedTab(t)) || FILES_TAB
                setActiveId(files.id)
                if (list.some((t) => t.id === files.id)) return list
                return [files, ...list.filter((t) => ! isPinnedTab(t))]
            }

            if (path) {
                const byPath = list.find((t) => t.path === path)
                if (byPath) {
                    setActiveId(byPath.id)
                    return list
                }
            } else if (! unique) {
                const existing = list.find((t) => (
                    panel ? t.panel === panel && ! t.path : t.label === label
                ))
                if (existing) {
                    setActiveId(existing.id)
                    return list
                }
            }

            let nextLabel = label
            if (unique && panel === 'console') {
                const n = list.filter((t) => t.panel === 'console').length
                nextLabel = n === 0 ? 'Console' : `Console ${n + 1}`
            }

            const id = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
            setActiveId(id)
            // Keep pinned Files first in the strip.
            const pinned = list.filter(isPinnedTab)
            const rest = list.filter((t) => ! isPinnedTab(t))
            return [...pinned, ...rest, { id, label: nextLabel, tone, panel, path }]
        })
    }, [])

    useEffect(() => {
        if (! openFileSignal?.path) return
        openTab(openFileSignal.name || openFileSignal.path, 'sky', 'editor', {
            path: openFileSignal.path,
        })
    }, [openFileSignal, openTab])

    useEffect(() => {
        if (! openConsoleSignal?.nonce) return
        if (openConsoleSignal.focus === false) {
            ensureConsoleTab()
            return
        }
        openTab('Console', 'emerald', 'console', { unique: false })
    }, [openConsoleSignal, ensureConsoleTab, openTab])

    useEffect(() => {
        if (! openPreviewSignal?.nonce) return
        setPreviewOn(true)
    }, [openPreviewSignal])

    useEffect(() => {
        if (! openTablesSignal?.nonce) return
        openTab('Supabase', 'teal', 'tables')
    }, [openTablesSignal, openTab])

    const onMenuSelect = useCallback((itemId) => {
        setMenuOpen(false)

        switch (itemId) {
            case 'files':
                openTab('Files', 'sky', 'files')
                break
            case 'console':
                openTab('Console', 'emerald', 'console', { unique: true })
                break
            case 'app-settings':
                openTab('App settings', 'violet', 'app-settings')
                break
            case 'supabase':
            case 'connect-supabase':
            case 'find-file':
            case 'new-file':
            case 'recently-opened':
                onWorkspaceCommand?.(itemId === 'connect-supabase' ? 'supabase' : itemId)
                break
            default:
                break
        }
    }, [onWorkspaceCommand, openTab])

    useEffect(() => {
        if (! menuOpen) return undefined

        const onPointerDown = (event) => {
            if (
                menuRef.current?.contains(event.target)
                || plusBtnRef.current?.contains(event.target)
            ) {
                return
            }
            setMenuOpen(false)
        }
        const onKey = (event) => {
            if (event.key === 'Escape') setMenuOpen(false)
        }

        // Re-measure after paint so real menu size is used, then keep in view.
        const raf = requestAnimationFrame(() => placeMenu())

        window.addEventListener('pointerdown', onPointerDown, true)
        window.addEventListener('keydown', onKey)
        window.addEventListener('resize', placeMenu)
        window.addEventListener('scroll', placeMenu, true)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('pointerdown', onPointerDown, true)
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('resize', placeMenu)
            window.removeEventListener('scroll', placeMenu, true)
        }
    }, [menuOpen, placeMenu])

    // Capture so Chrome cannot steal Ctrl+P (Print) / Ctrl+N (new window).
    useEffect(() => {
        const onKeyDown = (event) => {
            if (! (event.metaKey || event.ctrlKey)) return
            if (event.altKey) return

            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
            const code = event.code
            let action = null

            if ((key === '`' || code === 'Backquote') && ! event.shiftKey) action = 'console'
            else if (key === 'n' && ! event.shiftKey) action = 'new-file'
            else if (key === 'p' && ! event.shiftKey) action = 'find-file'
            else if (key === 'e' && event.shiftKey) action = 'files'
            else if (key === 'e' && ! event.shiftKey) action = 'recently-opened'
            else if (key === ',' && ! event.shiftKey) action = 'app-settings'

            if (! action) return

            event.preventDefault()
            event.stopPropagation()
            onMenuSelect(action)
        }

        window.addEventListener('keydown', onKeyDown, true)
        return () => window.removeEventListener('keydown', onKeyDown, true)
    }, [onMenuSelect])

    const closeTab = useCallback((id) => {
        setTabs((list) => {
            const hit = list.find((t) => t.id === id)
            if (hit && isPinnedTab(hit)) return list

            const next = list.filter((t) => t.id !== id)
            // Files must never leave the strip.
            const ensured = next.some(isPinnedTab) ? next : [{ ...FILES_TAB }, ...next]
            if (activeId === id) {
                const fallback = ensured.find((t) => t.id !== id)?.id ?? FILES_TAB_ID
                setActiveId(fallback)
            }
            return ensured
        })
    }, [activeId])

    const requestCloseTab = useCallback((tab) => {
        if (isPinnedTab(tab)) return
        const dirty = Boolean(tab.path && dirtyPaths[tab.path])
        if (dirty && onRequestCloseTab) {
            onRequestCloseTab(tab, () => closeTab(tab.id))
            return
        }
        closeTab(tab.id)
    }, [closeTab, dirtyPaths, onRequestCloseTab])

    return (
        <div className="flex h-full min-w-0 flex-1 items-center gap-0.5">
            <button
                type="button"
                onClick={() => setPreviewOn((v) => ! v)}
                className={[
                    'relative inline-flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium transition',
                    previewOn
                        ? 'text-krikkit-fg'
                        : 'text-krikkit-muted hover:text-krikkit-fg',
                ].join(' ')}
                aria-pressed={previewOn}
            >
                <IconMonitor className="h-3.5 w-3.5" />
                Preview
                {previewOn ? (
                    <span className="absolute inset-x-2 bottom-0 h-px bg-krikkit-fg" aria-hidden />
                ) : null}
            </button>

            <span className="mx-1 hidden h-3.5 w-px shrink-0 bg-krikkit-line sm:block" aria-hidden />

            <div
                ref={tabsScrollRef}
                className="krikkit-scroll-hover flex h-full min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden"
            >
                {tabs.map((tab) => {
                    const active = tab.id === activeId && ! previewOn
                    const dirty = Boolean(tab.path && dirtyPaths[tab.path])
                    const pinned = isPinnedTab(tab)
                    return (
                        <div
                            key={tab.id}
                            className={[
                                'group relative inline-flex h-8 max-w-[11rem] shrink-0 items-stretch text-xs transition',
                                active ? 'text-krikkit-fg' : 'text-krikkit-muted hover:text-krikkit-fg-soft',
                                dirty && ! active ? 'text-accent-content' : '',
                            ].join(' ')}
                            title={dirty ? `${tab.label} · unsaved` : tab.label}
                            onPointerDown={(event) => {
                                if (event.button !== 1) return
                                event.preventDefault()
                                event.stopPropagation()
                                if (! pinned) requestCloseTab(tab)
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveId(tab.id)
                                    setPreviewOn(false)
                                }}
                                className={[
                                    'inline-flex min-w-0 flex-1 items-center gap-1.5 text-left',
                                    pinned ? 'px-2.5' : 'pl-2.5 pr-1',
                                ].join(' ')}
                            >
                                <TabGlyph
                                    name={tabIconName(tab)}
                                    className={[
                                        'h-3.5 w-3.5 shrink-0',
                                        dirty
                                            ? 'text-accent-content'
                                            : active ? 'text-krikkit-fg' : 'text-krikkit-muted',
                                    ].join(' ')}
                                />
                                <span className={[
                                    'truncate',
                                    dirty ? 'text-accent-content' : '',
                                ].join(' ')}
                                >
                                    {truncateLabel(tab.label)}
                                </span>
                            </button>
                            {! pinned && (
                                <button
                                    type="button"
                                    aria-label={`Close ${tab.label}`}
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        requestCloseTab(tab)
                                    }}
                                    className={[
                                        'relative mr-1 inline-flex h-4 w-4 shrink-0 items-center justify-center self-center rounded text-krikkit-subtle transition hover:bg-krikkit-soft hover:text-krikkit-fg focus-visible:opacity-100',
                                        dirty
                                            ? 'opacity-100'
                                            : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                                    ].join(' ')}
                                >
                                    {dirty && (
                                        <span
                                            className="pointer-events-none absolute inset-0 flex items-center justify-center group-hover:opacity-0 group-focus-within:opacity-0"
                                            aria-hidden
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                                        </span>
                                    )}
                                    <IconClose
                                        className={[
                                            'h-3 w-3',
                                            dirty
                                                ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                                                : '',
                                        ].join(' ')}
                                        aria-hidden
                                    />
                                </button>
                            )}
                            {active ? (
                                <span className="absolute inset-x-2 bottom-0 h-px bg-krikkit-fg" aria-hidden />
                            ) : null}
                        </div>
                    )
                })}

                <div className="relative shrink-0">
                    <button
                        ref={plusBtnRef}
                        type="button"
                        onClick={toggleMenu}
                        aria-label="Open workspace menu"
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        className={[
                            'inline-flex h-6 w-6 items-center justify-center text-krikkit-muted transition',
                            menuOpen
                                ? 'text-krikkit-fg'
                                : 'hover:text-krikkit-fg',
                        ].join(' ')}
                    >
                        <IconPlus className="h-3.5 w-3.5" />
                    </button>

                    {menuOpen && (
                        <>
                        <button
                            type="button"
                            className="fixed inset-0 z-40 cursor-default"
                            aria-label="Close workspace menu"
                            onPointerDown={() => setMenuOpen(false)}
                        />
                        <div
                            ref={menuRef}
                            role="menu"
                            aria-label="Workspace actions"
                            style={{ top: menuPos.top, left: menuPos.left }}
                            className="fixed z-50 w-64 overflow-hidden rounded-xl border border-krikkit-line bg-krikkit-surface p-1.5"
                        >
                            {plusMenuGroups(PLUS_MENU).map((group, index) => (
                                <div key={group.id}>
                                    {index > 0 ? (
                                        <div className="mx-1.5 my-1 h-px bg-krikkit-line" role="separator" />
                                    ) : null}
                                    {group.items.map((entry) => (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            role="menuitem"
                                            onClick={() => onMenuSelect(entry.id)}
                                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-krikkit-soft"
                                        >
                                            <MenuIcon
                                                name={entry.icon}
                                                className="h-3.5 w-3.5 shrink-0 text-krikkit-muted"
                                            />
                                            <span className="min-w-0 flex-1 truncate text-[13px] text-krikkit-fg">
                                                {entry.label}
                                            </span>
                                            {entry.shortcut ? (
                                                <span className="shrink-0 text-[10px] tabular-nums text-krikkit-subtle">
                                                    {entry.shortcut}
                                                </span>
                                            ) : null}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
