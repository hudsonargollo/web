import { useId, useState } from 'react'
import { ToolStatusText } from './ToolStatusText'
import { IconChevron, IconGlobe } from './toolIcons'

/**
 * HTTP fetch peek — URL + status + short body.
 */
export function FetchCard({
    url = '',
    status = 'done',
    httpStatus = 0,
    ok = false,
    body = '',
    defaultOpen = false,
    onOpenChange,
}) {
    const panelId = useId()
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const pending = status === 'fetching'
    const verb = pending ? 'Fetching' : 'Fetched'
    const shortUrl = url.replace(/^https?:\/\//, '')
    const label = `${verb} ${shortUrl || 'request'}`
    const hasBody = Boolean(body) || pending

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
                <IconGlobe />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight" title={url}>
                    <ToolStatusText text={label} pending={pending} />
                </span>
                {! pending && httpStatus > 0 && (
                    <span
                        className={[
                            'inline-flex shrink-0 items-center gap-1 leading-tight tabular-nums',
                            ok ? 'text-emerald-500' : 'text-red-500',
                        ].join(' ')}
                    >
                        {httpStatus}
                    </span>
                )}
                {hasBody && <IconChevron open={isOpen} />}
            </button>

            {hasBody && isOpen ? (
                <div id={panelId} data-state="open" className="lab-tool-collapse">
                    <div className="lab-tool-collapse__clip">
                        <pre className="lab-tool-collapse__body bg-krikkit-soft border border-krikkit-line krikkit-scroll-hover max-h-40 overflow-auto rounded-xl px-3 py-2 font-mono text-[11px] leading-5 text-krikkit-fg">
                            {pending && ! body ? '…' : body}
                        </pre>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
