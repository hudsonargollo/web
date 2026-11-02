import { useId, useMemo, useState } from 'react'
import { ToolStatusText } from './ToolStatusText'
import { DiffPanel, countDiffRows } from './DiffPanel'
import { IconChevron, fileName } from './toolIcons'

function IconPen({ className = 'h-3.5 w-3.5' }) {
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
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
    )
}

/**
 * Full-file write tool — dense diff of the new body.
 */
export function WriteFileCard({
    path = '',
    status = 'done',
    rows = [],
    detail = '',
    defaultOpen = false,
    onOpenChange,
    staticEnter = false,
}) {
    const panelId = useId()
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const hasBody = rows.length > 0
    const name = String(path || '').trim() ? fileName(path) : 'file'
    const verb = status === 'writing'
        ? 'Writing'
        : (status === 'error' ? 'Write failed' : 'Wrote')
    const { added, removed } = useMemo(() => countDiffRows(rows), [rows])

    const toggle = () => {
        if (! hasBody) return
        const next = ! isOpen
        setIsOpen(next)
        onOpenChange?.(next)
    }

    return (
        <div
            className={['lab-crest-enter min-w-0', staticEnter ? 'lab-crest-enter--static' : ''].join(' ')}
            role="region"
            aria-label={`${verb} ${path || name}`}
            data-lab-chrome="writeFile"
        >
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={hasBody && isOpen ? panelId : undefined}
                onClick={toggle}
                className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit group text-krikkit-muted transition-colors hover:text-krikkit-fg-soft"
            >
                <IconPen />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight" title={path || name}>
                    <ToolStatusText text={`${verb} ${name}`} pending={status === 'writing'} />
                </span>
                {status === 'error' && detail ? (
                    <span className="max-w-[12rem] shrink-0 truncate text-[12px] text-krikkit-subtle" title={detail}>
                        {detail}
                    </span>
                ) : null}
                {(added > 0 || removed > 0) && (
                    <span className="inline-flex shrink-0 items-center gap-1 leading-tight" aria-label={`${added} added, ${removed} removed`}>
                        {added > 0 && <span className="text-emerald-500">+{added}</span>}
                        {removed > 0 && <span className="text-red-500">-{removed}</span>}
                    </span>
                )}
                {hasBody && <IconChevron open={isOpen} />}
            </button>

            {/* Mount only when open — closed 0fr/hidden panels still leak gap under the row. */}
            {hasBody && isOpen ? (
                <div
                    id={panelId}
                    data-state="open"
                    className="lab-tool-collapse"
                >
                    <div className="lab-tool-collapse__clip">
                        <div className="lab-tool-collapse__body">
                            <DiffPanel rows={rows} />
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
