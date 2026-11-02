import { ToolStatusText } from './ToolStatusText'
import { IconImage } from './toolIcons'

/**
 * lookup_visuals tool row — same chrome as write/read, no scene-query dump.
 */
export function LookupVisualsCard({
    status = 'done',
    count = 0,
    staticEnter = false,
}) {
    const pending = status === 'searching' || status === 'running'
    const n = Number(count) || 0
    const label = status === 'error'
        ? 'Photograph lookup failed'
        : (pending
            ? 'Looking up photographs'
            : (n > 0 ? `Looked up ${n} photograph${n === 1 ? '' : 's'}` : 'Looked up photographs'))

    return (
        <div
            className={['lab-crest-enter min-w-0 overflow-hidden', staticEnter ? 'lab-crest-enter--static' : ''].join(' ')}
            role="region"
            aria-label={label}
            data-lab-chrome="lookup-visuals"
        >
            <div className="inline-flex w-full max-w-full min-h-5 min-w-0 items-center justify-start gap-1.5 text-[13px] font-normal leading-5 text-krikkit-muted">
                <IconImage />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight">
                    <ToolStatusText text={label} pending={pending} />
                </span>
            </div>
        </div>
    )
}
