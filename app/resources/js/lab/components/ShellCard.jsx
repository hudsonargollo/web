import { useId, useState } from 'react'
import { ToolStatusText } from './ToolStatusText'
import { IconChevron, IconTerminal } from './toolIcons'

/**
 * Terminal / shell tool — command, exit code, last N lines; optional Console bridge.
 */
export function ShellCard({
    command = '',
    status = 'done',
    exitCode = 0,
    lines = [],
    truncated = false,
    defaultOpen = false,
    onOpenChange,
    onOpenConsole,
}) {
    const panelId = useId()
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const pending = status === 'running'
    const verb = pending ? 'Running' : 'Ran'
    const label = `${verb} ${command || 'command'}`
    const hasBody = lines.length > 0 || pending

    const toggle = () => {
        if (! hasBody) return
        const next = ! isOpen
        setIsOpen(next)
        onOpenChange?.(next)
    }

    return (
        <div className="lab-crest-enter min-w-0" role="region" aria-label={label}>
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={hasBody && isOpen ? panelId : undefined}
                onClick={toggle}
                className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit group text-krikkit-muted transition-colors hover:text-krikkit-fg-soft"
            >
                <IconTerminal />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight" title={command}>
                    <ToolStatusText text={label} pending={pending} />
                </span>
                {! pending && (
                    <span
                        className={[
                            'inline-flex shrink-0 items-center gap-1 leading-tight tabular-nums',
                            exitCode === 0 ? 'text-emerald-500' : 'text-red-500',
                        ].join(' ')}
                    >
                        exit {exitCode}
                    </span>
                )}
                {hasBody && <IconChevron open={isOpen} />}
            </button>

            {hasBody && isOpen ? (
                <div id={panelId} data-state="open" className="lab-tool-collapse">
                    <div className="lab-tool-collapse__clip">
                        <div className="lab-tool-collapse__body bg-krikkit-soft border border-krikkit-line overflow-hidden rounded-xl">
                            <pre className="krikkit-scroll-hover max-h-40 overflow-auto px-3 py-2 font-mono text-[11px] leading-5 text-krikkit-fg">
                                {pending && ! lines.length
                                    ? '…'
                                    : lines.join('\n')}
                                {truncated ? '\n…' : ''}
                            </pre>
                            {typeof onOpenConsole === 'function' && (
                                <div className="border-t border-krikkit-line px-3 py-1.5">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            onOpenConsole()
                                        }}
                                        className="text-[11px] text-krikkit-muted transition-colors hover:text-krikkit-fg"
                                    >
                                        Open Console
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
