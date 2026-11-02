import { useEffect, useRef, useState } from 'react'
import { createBackgroundFrameLoop } from '../lib/backgroundFrame'

const DEFAULT_MS = 15_000

function startDeadlineWorker(ms, onDone) {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return null
    try {
        const url = URL.createObjectURL(new Blob(
            ['onmessage=function(e){setTimeout(function(){postMessage(0)},e.data)}'],
            { type: 'text/javascript' },
        ))
        const worker = new Worker(url)
        URL.revokeObjectURL(url)
        worker.onmessage = () => onDone()
        worker.postMessage(ms)
        return worker
    } catch {
        return null
    }
}

/**
 * End-of-turn approval. Manual Switch (or ⌘/Ctrl+Enter) always works.
 * When `autoSwitch` is on (demo installs), the timer bar auto-accepts after `durationMs`.
 */
export function BuildGateCard({
    title = 'Build mode',
    body = 'Ready to open the workspace and start shaping this into a real build.',
    autoSwitch = false,
    durationMs = DEFAULT_MS,
    onSkip,
    onSwitch,
}) {
    const settled = useRef(false)
    const onSkipRef = useRef(onSkip)
    const onSwitchRef = useRef(onSwitch)
    onSkipRef.current = onSkip
    onSwitchRef.current = onSwitch

    const ms = Math.max(1, Number(durationMs) || DEFAULT_MS)
    const [ratio, setRatio] = useState(1)

    const finish = (action) => {
        if (settled.current) return
        settled.current = true
        try {
            action?.()
        } catch (error) {
            settled.current = false
            throw error
        }
    }

    const accept = () => finish(() => onSwitchRef.current?.())
    const skip = () => finish(() => onSkipRef.current?.())

    useEffect(() => {
        if (! autoSwitch) return undefined

        settled.current = false
        setRatio(1)
        const deadline = Date.now() + ms
        const loop = createBackgroundFrameLoop()

        const tick = () => {
            if (settled.current) return
            const remain = Math.max(0, deadline - Date.now())
            setRatio(remain / ms)
            if (remain <= 0) {
                accept()
                return
            }
            loop.schedule(tick)
        }
        loop.schedule(tick)

        const worker = startDeadlineWorker(ms, () => accept())

        return () => {
            loop.cancel()
            worker?.terminate()
        }
        // Parent callback identity must not reset the bar.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSwitch, ms])

    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                accept()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div
            className="lab-crest-enter relative overflow-hidden rounded-2xl bg-krikkit-fg/[0.04] dark:bg-krikkit-fg/[0.10]"
            role="region"
            aria-label={title}
        >
            <div className="px-5 pt-4 pb-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent-content">
                    {title}
                </p>
                <p className="mt-2 max-w-md text-[15px] leading-snug tracking-tight text-krikkit-fg">
                    {body}
                </p>

                <div className="mt-4 flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={skip}
                        className="text-sm text-krikkit-subtle transition hover:text-krikkit-fg-soft"
                    >
                        Skip
                    </button>
                    <button
                        type="button"
                        onClick={accept}
                        aria-keyshortcuts="Control+Enter"
                        className="text-sm font-medium text-accent-content transition hover:opacity-80"
                    >
                        Switch
                    </button>
                </div>
            </div>

            <div className="h-1 w-full bg-krikkit-fg/[0.08]" aria-hidden>
                <div
                    className={[
                        'h-full bg-gradient-to-r from-accent via-accent/70 to-transparent',
                        autoSwitch ? '' : 'lab-gate-timer-bar',
                    ].join(' ')}
                    style={autoSwitch ? { width: `${Math.max(0, Math.min(1, ratio)) * 100}%` } : undefined}
                />
            </div>
        </div>
    )
}
