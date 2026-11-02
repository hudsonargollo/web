import { useId, useState } from 'react'
import { presentLabError } from '../lib/labErrors'
import { LAB_BTN_PRIMARY } from '../lib/labConstants'
import { LabTooltip } from './LabTooltip'
import { IconChevron } from './toolIcons'

/**
 * Composer Action Card for build / runtime faults.
 * Details expand inside the same card (no floating second panel).
 * Multiple runtime errors are listed explicitly — never collapsed to (+N more).
 */
export function RuntimeErrorCard({
    target,
    onFix,
    onDismiss,
    disabled = false,
}) {
    const panelId = useId()
    const [open, setOpen] = useState(false)

    if (! target) return null

    const presented = presentLabError(target)
    const fixLabel = 'Fix with AI'
    const detailsLabel = open ? 'Hide details' : 'Show details'

    const errors = Array.isArray(target.errors) && target.errors.length
        ? target.errors
        : [{
            message: presented.title,
            file: presented.file || target.file,
            component: presented.component || target.component,
            stack: presented.detail || target.stack,
            line: target.line,
        }]

    const multi = errors.length > 1
    const primaryFile = target.file || presented.file || errors[0]?.file || null
    const primaryComponent = target.component || presented.component || errors[0]?.component || null
    const fileLabel = multi
        ? `${errors.length} errors`
        : (primaryComponent && primaryFile
            ? `${primaryComponent} · ${primaryFile}`
            : (primaryFile || primaryComponent || null))

    const detail = multi
        ? errors.map((row, index) => {
            const loc = row.file
                ? (row.line != null ? `${row.file}:${row.line}` : row.file)
                : 'unknown'
            const component = row.component ? ` (${row.component})` : ''
            const stack = row.stack && row.stack !== row.message
                ? `\n${String(row.stack).split('\n').join('\n')}`
                : ''
            return `Error ${index + 1}: ${row.message} at ${loc}${component}${stack}`
        }).join('\n\n')
        : (presented.detail || presented.title)

    const title = multi
        ? `${errors.length} runtime errors`
        : presented.title

    const canExpand = Boolean(detail && (multi || detail !== presented.title))

    const stopScrollChain = (event) => {
        event.stopPropagation()
    }

    return (
        <div
            className="lab-crest-enter overflow-hidden rounded-xl bg-krikkit-surface"
            role="region"
            aria-label={presented.badge}
            onWheel={stopScrollChain}
            onTouchMove={stopScrollChain}
        >
            <div className="flex items-start gap-2 px-3 pt-2.5">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-red-500 dark:text-red-300">
                            {presented.badge}
                        </span>
                        {fileLabel ? (
                            <span
                                className="inline-flex max-w-full items-center truncate rounded-md border border-krikkit-line bg-krikkit-soft px-1.5 py-0.5 font-mono text-[10px] text-krikkit-muted"
                                title={fileLabel}
                            >
                                {fileLabel}
                            </span>
                        ) : null}
                    </div>

                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-krikkit-fg">
                        {title}
                    </p>

                    {multi ? (
                        <ul className="mt-2 space-y-1.5">
                            {errors.map((row, index) => (
                                <li
                                    key={`${row.file || 'x'}-${index}-${row.message}`}
                                    className="rounded-lg border border-krikkit-line bg-krikkit-canvas px-2 py-1.5"
                                >
                                    <p className="font-mono text-[10px] uppercase tracking-wide text-krikkit-subtle">
                                        {`Error ${index + 1}`}
                                        {row.component ? ` · ${row.component}` : ''}
                                        {row.file ? ` · ${row.file}` : ''}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-krikkit-fg-soft">
                                        {row.message}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>

                <LabTooltip content="Dismiss">
                    <button
                        type="button"
                        onClick={onDismiss}
                        disabled={disabled}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-krikkit-subtle transition hover:bg-krikkit-soft hover:text-krikkit-fg disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Dismiss"
                    >
                        <span className="text-sm leading-none" aria-hidden>×</span>
                    </button>
                </LabTooltip>
            </div>

            {canExpand && open ? (
                <div
                    id={panelId}
                    data-state="open"
                    className="lab-tool-collapse px-3"
                >
                    <div className="lab-tool-collapse__clip">
                        <div className="lab-tool-collapse__body">
                            <pre className="krikkit-scroll-hover max-h-44 overflow-auto rounded-lg border border-krikkit-line bg-krikkit-canvas px-3 py-2 font-mono text-[11px] leading-5 text-krikkit-fg-soft whitespace-pre-wrap break-words">
                                {detail}
                            </pre>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="flex items-center justify-between gap-2 px-3 py-2">
                {canExpand ? (
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpen((value) => ! value)}
                        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                    >
                        <IconChevron open={open} className="h-3.5 w-3.5 shrink-0" />
                        {detailsLabel}
                    </button>
                ) : (
                    <span />
                )}

                <button
                    type="button"
                    onClick={onFix}
                    disabled={disabled}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${LAB_BTN_PRIMARY}`}
                >
                    {fixLabel}
                </button>
            </div>
        </div>
    )
}
