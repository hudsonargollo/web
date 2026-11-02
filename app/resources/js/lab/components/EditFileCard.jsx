import { useId, useMemo, useState } from 'react'
import { ToolStatusText } from './ToolStatusText'
import { DiffPanel, countDiffRows } from './DiffPanel'
import { IconChevron, IconDiff, fileName } from './toolIcons'

/**
 * Small patch tool — separate from full Write; +N −M meta.
 */
export function EditFileCard({
    path = '',
    status = 'done',
    rows = [],
    defaultOpen = false,
    onOpenChange,
}) {
    const panelId = useId()
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const hasBody = rows.length > 0
    const name = useMemo(() => fileName(path), [path])
    const verb = status === 'editing' ? 'Editing' : 'Edited'
    const { added, removed } = useMemo(() => countDiffRows(rows), [rows])

    const toggle = () => {
        if (! hasBody) return
        const next = ! isOpen
        setIsOpen(next)
        onOpenChange?.(next)
    }

    return (
        <div className="lab-crest-enter min-w-0" role="region" aria-label={`${verb} ${path || name}`}>
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={hasBody && isOpen ? panelId : undefined}
                onClick={toggle}
                className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit group text-krikkit-muted transition-colors hover:text-krikkit-fg-soft"
            >
                <IconDiff />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight" title={path || name}>
                    <ToolStatusText text={`${verb} ${name}`} pending={status === 'editing'} />
                </span>
                {(added > 0 || removed > 0) && (
                    <span className="inline-flex shrink-0 items-center gap-1 leading-tight" aria-label={`${added} added, ${removed} removed`}>
                        {added > 0 && <span className="text-emerald-500">+{added}</span>}
                        {removed > 0 && <span className="text-red-500">−{removed}</span>}
                    </span>
                )}
                {hasBody && <IconChevron open={isOpen} />}
            </button>

            {hasBody && isOpen ? (
                <div
                    id={panelId}
                    data-state="open"
                    className="lab-tool-collapse"
                >
                    <div className="lab-tool-collapse__clip">
                        <div className="lab-tool-collapse__body">
                            <DiffPanel path={path} rows={rows} label={`Patch for ${path || name}`} />
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
