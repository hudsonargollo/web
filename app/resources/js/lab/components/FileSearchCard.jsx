import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ToolStatusText } from './ToolStatusText'

/** Intentional hover only — ignores cursor skims across the row. */
const HOVER_OPEN_MS = 400

function IconSearch({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </svg>
    )
}

function IconFile({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M7.75 3.75h5.69c.4 0 .78.16 1.06.44l4.06 4.06c.28.28.44.66.44 1.06v10.94a1.5 1.5 0 0 1-1.5 1.5H7.75a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path
                d="M13 3.75v4.5a1 1 0 0 0 1 1h4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function statusVerb(status) {
    return status === 'searching' ? 'Searching' : 'Searched'
}

function fileName(path = '') {
    const clean = String(path).replace(/\\/g, '/')
    const base = clean.split('/').filter(Boolean).pop()
    return base || clean || 'untitled'
}

function fileDir(path = '') {
    const clean = String(path).replace(/\\/g, '/').replace(/^\.\//, '')
    const parts = clean.split('/').filter(Boolean)
    if (parts.length <= 1) return ''
    return `./${parts.slice(0, -1).join('/')}`
}

/**
 * Chat file-search tool — hover popover list (overlays chat, animated).
 */
export function FileSearchCard({
    query = '',
    status = 'done',
    hits = [],
    onOpenChange,
    onOpenPath,
}) {
    const panelId = useId()
    const [peek, setPeek] = useState(false)
    const openTimerRef = useRef(0)
    const verb = statusVerb(status)
    const q = (query || '').trim()
    const label = `${verb}${q ? ` ${q}` : ''}`
    const fileCount = hits.length
    const hasBody = fileCount > 0 || status === 'searching'
    const open = peek && hasBody

    const paths = useMemo(
        () => hits.map((hit) => hit.path).filter(Boolean),
        [hits],
    )

    useEffect(() => () => {
        if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
    }, [])

    const clearOpenTimer = () => {
        if (openTimerRef.current) {
            window.clearTimeout(openTimerRef.current)
            openTimerRef.current = 0
        }
    }

    const show = () => {
        setPeek(true)
        onOpenChange?.(true)
    }

    const hide = () => {
        clearOpenTimer()
        setPeek(false)
    }

    /** Mouse: wait so skims don’t flash the list. Keyboard focus: open now. */
    const onHoverEnter = () => {
        if (! hasBody) return
        clearOpenTimer()
        openTimerRef.current = window.setTimeout(show, HOVER_OPEN_MS)
    }

    const onFocusEnter = () => {
        if (! hasBody) return
        clearOpenTimer()
        show()
    }

    return (
        <div
            className={[
                'lab-crest-enter relative min-w-0',
                open ? 'z-30' : 'z-0',
            ].join(' ')}
            role="region"
            aria-label={label}
            onMouseEnter={onHoverEnter}
            onMouseLeave={hide}
            onFocusCapture={onFocusEnter}
            onBlurCapture={(event) => {
                if (! event.currentTarget.contains(event.relatedTarget)) {
                    hide()
                }
            }}
        >
            <div className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit text-krikkit-muted">
                <IconSearch />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight" title={q || undefined}>
                    <ToolStatusText
                        text={label}
                        pending={status === 'searching'}
                    />
                </span>
                {status === 'done' && fileCount > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 leading-tight text-krikkit-subtle" aria-label={`${fileCount} files`}>
                        {fileCount}
                    </span>
                )}
            </div>

            {hasBody && (
                <div
                    id={panelId}
                    data-state={open ? 'open' : 'closed'}
                    className={[
                        'lab-tool-popover absolute left-0 right-0 top-full z-30 pt-1.5',
                        open ? 'lab-tool-popover--open' : '',
                    ].join(' ')}
                    aria-hidden={! open}
                >
                    {/* pt-1.5 is a hover bridge — no gap that kills mouseenter */}
                    <ul
                        className="bg-krikkit-soft border border-krikkit-line krikkit-scroll-hover max-h-52 list-none overflow-auto rounded-xl py-1"
                        aria-label="Search results"
                    >
                        {status === 'searching' && fileCount === 0 ? (
                            <li className="px-3 py-2 text-[12px] text-krikkit-subtle">
                                Scanning workspace…
                            </li>
                        ) : (
                            paths.map((path) => {
                                const name = fileName(path)
                                const dir = fileDir(path)
                                const openable = typeof onOpenPath === 'function'
                                return (
                                    <li key={path} className="min-w-0">
                                        {openable ? (
                                            <button
                                                type="button"
                                                onClick={() => onOpenPath(path)}
                                                className="flex w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left text-[12px] leading-5 transition-colors hover:bg-krikkit-canvas/70"
                                            >
                                                <IconFile className="h-3.5 w-3.5 shrink-0 text-krikkit-subtle" />
                                                <span className="min-w-0 truncate">
                                                    <span className="font-normal text-krikkit-fg">{name}</span>
                                                    {dir ? (
                                                        <span className="text-krikkit-subtle"> {dir}</span>
                                                    ) : null}
                                                </span>
                                            </button>
                                        ) : (
                                            <div className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-[12px] leading-5">
                                                <IconFile className="h-3.5 w-3.5 shrink-0 text-krikkit-subtle" />
                                                <span className="min-w-0 truncate">
                                                    <span className="font-normal text-krikkit-fg">{name}</span>
                                                    {dir ? (
                                                        <span className="text-krikkit-subtle"> {dir}</span>
                                                    ) : null}
                                                </span>
                                            </div>
                                        )}
                                    </li>
                                )
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}
