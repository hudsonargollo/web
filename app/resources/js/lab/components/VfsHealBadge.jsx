import { ToolStatusText } from './ToolStatusText'

import { vfsHealResolvingLabel } from '../orchestration/vfsHealSignal'

function vfsHealDoneLabel(count = 0) {
    const n = Math.max(0, Number(count) || 0)
    if (n <= 1) {
        return 'Resolved 1 missing module before compile'
    }
    return `Resolved ${n} missing modules before compile`
}

/**
 * Tool-row heal marker — same chrome as Shell/Write cards (no status dot).
 * Click focuses the Terminal tab.
 */
export function VfsHealBadge({
    count = 0,
    active = true,
    onOpenTerminal,
    staticEnter = false,
}) {
    const label = active ? vfsHealResolvingLabel(count) : vfsHealDoneLabel(count)
    const interactive = typeof onOpenTerminal === 'function'

    const row = (
        <>
            <span
                className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center font-mono text-[11px] leading-none text-krikkit-muted"
                aria-hidden
            >
                {'>_'}
            </span>
            <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight">
                <ToolStatusText text={label} pending={active} />
            </span>
        </>
    )

    return (
        <div
            className={['lab-crest-enter min-w-0', staticEnter ? 'lab-crest-enter--static' : ''].join(' ')}
            role="status"
            aria-label={label}
            data-lab-chrome="vfsHeal"
        >
            {interactive ? (
                <button
                    type="button"
                    onClick={onOpenTerminal}
                    aria-label={`${label} Open Terminal`}
                    className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit group text-krikkit-muted transition-colors hover:text-krikkit-fg-soft"
                >
                    {row}
                </button>
            ) : (
                <div className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-krikkit-muted">
                    {row}
                </div>
            )}
        </div>
    )
}
