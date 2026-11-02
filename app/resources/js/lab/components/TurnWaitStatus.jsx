import { useEffect, useState } from 'react'
import { formatLabElapsed, parseLabTimestamp } from '../lib/labElapsed'
import { ToolStatusText } from './ToolStatusText'

/** Chevron wavefront across a 3×3 grid — two fronts in flight (cycle < sweep). */
const DRIVE_DELAYS = Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3)
    const col = i % 3
    return (col + Math.abs(row - 1)) * 90
})
const DRIVE_MS = 650

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        const sync = () => setReduced(mq.matches)
        sync()
        mq.addEventListener('change', sync)
        return () => mq.removeEventListener('change', sync)
    }, [])
    return reduced
}

function DriveGrid({ frozen = false }) {
    return (
        <span aria-hidden className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
            {DRIVE_DELAYS.map((delay, index) => (
                <span
                    key={index}
                    className="lab-pixel-cell size-[4px] rounded-[1px] bg-krikkit-fg"
                    style={frozen
                        ? undefined
                        : { animation: `lab-pixel-on ${DRIVE_MS}ms ease-in-out ${delay}ms infinite` }}
                />
            ))}
        </span>
    )
}

/**
 * Waiting-for-model row — 3×3 pixel grid, not the brain.
 * Brain is ChatThinking only.
 */
export function TurnWaitStatus({
    label = 'Waiting for model…',
    startedAt = null,
    running = true,
}) {
    const reduced = usePrefersReducedMotion()
    const start = parseLabTimestamp(startedAt)
    const [now, setNow] = useState(() => Date.now())
    const frozen = reduced || ! running

    useEffect(() => {
        if (! running || reduced) return undefined
        const tick = window.setInterval(() => setNow(Date.now()), 100)
        return () => window.clearInterval(tick)
    }, [running, reduced])

    return (
        <div
            role="status"
            aria-live="polite"
            className="inline-flex h-5 min-w-0 items-center justify-start gap-2.5 text-[13px] leading-5 text-krikkit-muted"
        >
            <DriveGrid frozen={frozen} />
            <span className="inline-flex h-5 min-w-0 flex-none items-center overflow-hidden text-ellipsis whitespace-nowrap leading-5">
                <ToolStatusText text={label} pending={running && ! reduced} />
            </span>
            <span className="font-mono text-[12px] text-krikkit-subtle tabular-nums">
                {formatLabElapsed(now - start)}
            </span>
        </div>
    )
}
