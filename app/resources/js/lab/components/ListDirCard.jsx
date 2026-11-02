import { useId, useState } from 'react'
import { ToolStatusText } from './ToolStatusText'
import { IconChevron, IconFile, IconFolder } from './toolIcons'

/**
 * List directory — “scanned src · 12 items”.
 */
export function ListDirCard({
    path = 'src',
    status = 'done',
    items = [],
    defaultOpen = false,
    onOpenChange,
    onOpenPath,
    staticEnter = false,
}) {
    const panelId = useId()
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const dir = path || '.'
    const count = items.length
    const verb = status === 'listing' ? 'Scanning' : 'Scanned'
    const label = `${verb} ${dir}`
    const hasBody = count > 0 || status === 'listing'

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
            aria-label={`${label} · ${count} items`}
            data-lab-chrome="listDir"
        >
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={hasBody && isOpen ? panelId : undefined}
                onClick={toggle}
                className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit group text-krikkit-muted transition-colors hover:text-krikkit-fg-soft"
            >
                <IconFolder />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight" title={dir}>
                    <ToolStatusText text={label} pending={status === 'listing'} />
                </span>
                {status === 'done' && (
                    <span className="inline-flex shrink-0 items-center gap-1 leading-tight text-krikkit-subtle">
                        {count} item{count === 1 ? '' : 's'}
                    </span>
                )}
                {hasBody && <IconChevron open={isOpen} />}
            </button>

            {hasBody && isOpen ? (
                <div id={panelId} data-state="open" className="lab-tool-collapse">
                    <div className="lab-tool-collapse__clip">
                        <ul className="lab-tool-collapse__body bg-krikkit-soft border border-krikkit-line krikkit-scroll-hover max-h-52 list-none overflow-auto rounded-xl py-1">
                            {status === 'listing' && count === 0 ? (
                                <li className="px-3 py-2 text-[12px] text-krikkit-subtle">Listing…</li>
                            ) : (
                                items.map((item) => {
                                    const openable = item.type === 'file' && typeof onOpenPath === 'function'
                                    const Glyph = item.type === 'folder' ? IconFolder : IconFile
                                    const row = (
                                        <>
                                            <Glyph className="h-3.5 w-3.5 shrink-0 text-krikkit-subtle" />
                                            <span className="truncate text-krikkit-fg">{item.name}</span>
                                            <span className="ml-auto shrink-0 text-[10px] text-krikkit-subtle">
                                                {item.type}
                                            </span>
                                        </>
                                    )
                                    return (
                                        <li key={item.path || item.name} className="min-w-0">
                                            {openable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenPath(item.path)}
                                                    className="flex w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-krikkit-canvas/70"
                                                >
                                                    {row}
                                                </button>
                                            ) : (
                                                <div className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-[12px]">
                                                    {row}
                                                </div>
                                            )}
                                        </li>
                                    )
                                })
                            )}
                        </ul>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
