import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ToolStatusText } from './ToolStatusText'
import { IconFile, IconGrep, fileName } from './toolIcons'

const HOVER_OPEN_MS = 400

/**
 * Search-in-files — path + line + matching snippet (not File Search).
 */
export function GrepCard({
    pattern = '',
    status = 'done',
    hits = [],
    onOpenChange,
    onOpenPath,
}) {
    const panelId = useId()
    const [peek, setPeek] = useState(false)
    const openTimerRef = useRef(0)
    const q = (pattern || '').trim()
    const verb = status === 'searching' ? 'Grepping' : 'Grepped'
    const label = `${verb}${q ? ` ${q}` : ''}`
    const count = hits.length
    const hasBody = count > 0 || status === 'searching'
    const open = peek && hasBody

    const rows = useMemo(() => hits.filter((hit) => hit?.path), [hits])

    useEffect(() => () => {
        if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
    }, [])

    const clearTimer = () => {
        if (openTimerRef.current) {
            window.clearTimeout(openTimerRef.current)
            openTimerRef.current = 0
        }
    }

    return (
        <div
            className={['lab-crest-enter relative min-w-0', open ? 'z-30' : 'z-0'].join(' ')}
            role="region"
            aria-label={label}
            onMouseEnter={() => {
                if (! hasBody) return
                clearTimer()
                openTimerRef.current = window.setTimeout(() => {
                    setPeek(true)
                    onOpenChange?.(true)
                }, HOVER_OPEN_MS)
            }}
            onMouseLeave={() => {
                clearTimer()
                setPeek(false)
            }}
            onFocusCapture={() => {
                if (! hasBody) return
                clearTimer()
                setPeek(true)
            }}
            onBlurCapture={(event) => {
                if (! event.currentTarget.contains(event.relatedTarget)) setPeek(false)
            }}
        >
            <div className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit text-krikkit-muted">
                <IconGrep />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight" title={q || undefined}>
                    <ToolStatusText text={label} pending={status === 'searching'} />
                </span>
                {status === 'done' && (
                    <span className="inline-flex shrink-0 items-center gap-1 leading-tight text-krikkit-subtle">{count}</span>
                )}
            </div>

            {hasBody && (
                <div
                    id={panelId}
                    className={[
                        'lab-tool-popover absolute left-0 right-0 top-full z-30 pt-1.5',
                        open ? 'lab-tool-popover--open' : '',
                    ].join(' ')}
                    aria-hidden={! open}
                >
                    <ul className="bg-krikkit-soft border border-krikkit-line krikkit-scroll-hover max-h-52 list-none overflow-auto rounded-xl py-1">
                        {status === 'searching' && count === 0 ? (
                            <li className="px-3 py-2 text-[12px] text-krikkit-subtle">Scanning contents…</li>
                        ) : (
                            rows.map((hit) => {
                                const openable = typeof onOpenPath === 'function'
                                const key = `${hit.path}:${hit.line}`
                                const inner = (
                                    <>
                                        <IconFile className="h-3.5 w-3.5 shrink-0 text-krikkit-subtle" />
                                        <span className="min-w-0 flex-1 truncate">
                                            <span className="text-krikkit-fg">{fileName(hit.path)}</span>
                                            <span className="text-krikkit-subtle">:{hit.line}</span>
                                            {hit.text ? (
                                                <span className="text-krikkit-muted"> — {hit.text}</span>
                                            ) : null}
                                        </span>
                                    </>
                                )
                                return (
                                    <li key={key} className="min-w-0">
                                        {openable ? (
                                            <button
                                                type="button"
                                                onClick={() => onOpenPath(hit.path, hit.line)}
                                                className="flex w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left text-[12px] leading-5 transition-colors hover:bg-krikkit-canvas/70"
                                            >
                                                {inner}
                                            </button>
                                        ) : (
                                            <div className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-[12px] leading-5">
                                                {inner}
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
