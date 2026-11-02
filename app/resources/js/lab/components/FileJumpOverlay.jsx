import { useEffect, useMemo, useRef, useState } from 'react'

function fileName(path = '') {
    const parts = String(path).replace(/\\/g, '/').split('/').filter(Boolean)
    return parts[parts.length - 1] || path
}

function fileDir(path = '') {
    const parts = String(path).replace(/\\/g, '/').replace(/^\.\//, '').split('/').filter(Boolean)
    if (parts.length <= 1) return ''
    return parts.slice(0, -1).join('/')
}

function rankPath(path, query) {
    if (! query) return 1
    const name = fileName(path).toLowerCase()
    const full = String(path).toLowerCase()
    const q = query.toLowerCase()
    if (name === q) return 100
    if (name.startsWith(q)) return 80
    if (name.includes(q)) return 60
    if (full.includes(q)) return 40
    return 0
}

function IconFile({ className = 'h-4 w-4' }) {
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

/**
 * Quick-open overlay — Find file (Ctrl+P) and Recently opened (Ctrl+E).
 */
export function FileJumpOverlay({
    open = false,
    mode = 'find',
    paths = [],
    onClose,
    onOpen,
}) {
    const inputRef = useRef(null)
    const [query, setQuery] = useState('')
    const [active, setActive] = useState(0)

    const isRecent = mode === 'recent'
    const title = isRecent ? 'Recently opened' : 'Find file'
    const placeholder = isRecent ? 'Filter recent files…' : 'Search files by name…'

    const ranked = useMemo(() => {
        const q = query.trim()
        const scored = paths
            .map((path) => ({ path, score: rankPath(path, q) }))
            .filter((row) => row.score > 0)
            .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
        return scored.slice(0, 40)
    }, [paths, query])

    useEffect(() => {
        if (! open) return undefined
        setQuery('')
        setActive(0)
        const id = window.requestAnimationFrame(() => inputRef.current?.focus())
        return () => window.cancelAnimationFrame(id)
    }, [open, mode])

    useEffect(() => {
        setActive(0)
    }, [query, paths])

    useEffect(() => {
        if (! open) return undefined

        const onKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose?.()
                return
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActive((n) => Math.min(ranked.length - 1, n + 1))
                return
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActive((n) => Math.max(0, n - 1))
                return
            }
            if (event.key === 'Enter') {
                const hit = ranked[active]
                if (! hit) return
                event.preventDefault()
                onOpen?.(hit.path)
            }
        }

        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [open, ranked, active, onClose, onOpen])

    if (! open) return null

    const emptyHint = paths.length === 0
        ? (isRecent
            ? 'No recent files yet. Open one from Files or Find file.'
            : 'No files in this workspace yet.')
        : 'No matching files.'

    return (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" data-lab-workspace-palette>
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Dismiss"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-krikkit-line bg-krikkit-canvas"
            >
                <div className="border-b border-krikkit-line px-3 py-2.5">
                    <p className="px-1 pb-1.5 text-[11px] font-medium tracking-[0.14em] text-krikkit-subtle uppercase">
                        {title}
                    </p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={placeholder}
                        className="h-10 w-full rounded-full border border-transparent bg-krikkit-surface px-4 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle focus:border-krikkit-muted/40"
                    />
                </div>

                <ul className="krikkit-scroll-hover max-h-80 overflow-y-auto p-1.5">
                    {ranked.length === 0 ? (
                        <li className="px-3 py-8 text-center text-sm text-krikkit-muted">
                            {emptyHint}
                        </li>
                    ) : ranked.map((row, index) => {
                        const name = fileName(row.path)
                        const dir = fileDir(row.path)
                        const selected = index === active
                        return (
                            <li key={row.path}>
                                <button
                                    type="button"
                                    onMouseEnter={() => setActive(index)}
                                    onClick={() => onOpen?.(row.path)}
                                    className={[
                                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition',
                                        selected
                                            ? 'bg-krikkit-soft text-krikkit-fg'
                                            : 'text-krikkit-fg hover:bg-krikkit-soft/70',
                                    ].join(' ')}
                                >
                                    <IconFile className="h-4 w-4 shrink-0 text-krikkit-muted" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-medium">
                                            {name}
                                        </span>
                                        {dir ? (
                                            <span className="block truncate text-[11px] text-krikkit-subtle">
                                                {dir}
                                            </span>
                                        ) : null}
                                    </span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}
