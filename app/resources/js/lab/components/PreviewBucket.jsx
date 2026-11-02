import { useEffect, useRef, useState } from 'react'
import { Code2, Compass, Eye, Hourglass, Layers, MessageCircle, Pencil, ShieldCheck, Sparkles } from 'lucide-react'

const ACTIVITY_CHIPS = {
    waiting: {
        id: 'waiting',
        title: 'Waiting for model',
        description: 'No tokens yet',
        Icon: Hourglass,
    },
    thinking: {
        id: 'thinking',
        title: 'Thinking',
        description: 'Working through the request',
        Icon: Sparkles,
    },
    planning: {
        id: 'planning',
        title: 'Planning',
        description: 'Mapping the next steps',
        Icon: Compass,
    },
    writing: {
        id: 'writing',
        title: 'Writing code',
        description: 'Landing files in the workspace',
        Icon: Code2,
    },
    reading: {
        id: 'reading',
        title: 'Reading',
        description: 'Inspecting the workspace',
        Icon: Eye,
    },
    checking: {
        id: 'checking',
        title: 'Checking',
        description: 'Making sure it compiles',
        Icon: ShieldCheck,
    },
    repairing: {
        id: 'repairing',
        title: 'Repairing',
        description: 'Fixing the preview',
        Icon: Pencil,
    },
    summarizing: {
        id: 'summarizing',
        title: 'Summarizing',
        description: 'Wrapping up the turn',
        Icon: MessageCircle,
    },
    installing: {
        id: 'installing',
        title: 'Installing',
        description: 'Setting up the workspace',
        Icon: Layers,
    },
    preview: {
        id: 'preview',
        title: 'Preview',
        description: 'Dev server warming up',
        Icon: Eye,
    },
}

/**
 * Pick the overlay chip from the live turn — not a rotating marketing set.
 */
export function resolvePreviewActivity({
    status = '',
    thinking = false,
    writing = false,
    busy = false,
    streaming = false,
    healing = false,
    runtimePhase = '',
    previewReloadPending = false,
} = {}) {
    const text = String(status || '').toLowerCase()
    if (healing || /\brepair/.test(text)) return 'repairing'
    if (/\bsummar/.test(text)) return 'summarizing'
    if (/\bvalidat|\bchecking/.test(text)) return 'checking'
    if (/\bplann/.test(text)) return 'planning'
    if (/\bwaiting for model/.test(text)) return 'waiting'
    if (/\bthink/.test(text) || thinking) return 'thinking'
    if (/\bread|\bscann|\bobserv|\blist.?dir/.test(text)) return 'reading'
    if (/\binstall/.test(text) || runtimePhase === 'install' || runtimePhase === 'install-done') {
        return 'installing'
    }
    if (/\breload|updating preview/.test(text) || previewReloadPending) return 'preview'
    if (/\bwrit|\bstarting build|\bapply/.test(text) || writing) return 'writing'
    if (busy || streaming) return 'waiting'
    return 'preview'
}

function ChipCard({ chip, phase }) {
    const Icon = chip.Icon
    return (
        <div
            className={[
                'lab-bucket-chip pointer-events-none absolute flex w-[min(15rem,70%)] origin-bottom items-center gap-2 rounded-full border border-krikkit-line bg-krikkit-surface p-2',
                phase === 'out' ? 'lab-bucket-chip--out' : 'lab-bucket-chip--in',
            ].join(' ')}
        >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-krikkit-soft text-accent-content">
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 pr-2">
                <span className="block truncate text-[13px] font-medium leading-tight text-krikkit-fg">
                    {chip.title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] leading-tight text-krikkit-muted">
                    {chip.description}
                </span>
            </span>
        </div>
    )
}

/**
 * Layered glass bucket — one chip for the live activity, animated only on change.
 * Tokens + blur for depth; no box-shadow.
 */
export function PreviewBucket({ activity = 'preview' }) {
    const chipId = ACTIVITY_CHIPS[activity] ? activity : 'preview'
    const currentRef = useRef(chipId)
    const [current, setCurrent] = useState(chipId)
    const [leaving, setLeaving] = useState(null)
    const shown = ACTIVITY_CHIPS[current] || ACTIVITY_CHIPS.preview
    const outgoing = leaving ? ACTIVITY_CHIPS[leaving] : null

    useEffect(() => {
        if (chipId === currentRef.current) return undefined
        const from = currentRef.current
        currentRef.current = chipId
        setLeaving(from)
        setCurrent(chipId)
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduce) {
            setLeaving(null)
            return undefined
        }
        const timer = window.setTimeout(() => setLeaving(null), 820)
        return () => window.clearTimeout(timer)
    }, [chipId])

    return (
        <div className="flex w-full max-w-[36rem] flex-col items-center px-6" role="status" aria-live="polite">
            <div
                className="lab-bucket relative isolate w-full"
                style={{ aspectRatio: '655 / 352' }}
                aria-hidden="true"
            >
                <svg
                    className="absolute inset-0 z-0 h-full w-full"
                    viewBox="0 0 655 352"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M512.766 79.16H147.766C136.453 79.16 130.796 79.16 127.281 82.677C123.766 86.192 123.766 91.849 123.766 103.162V327.159C123.766 338.473 123.766 344.13 127.281 347.645C130.796 351.159 136.453 351.159 147.766 351.159H512.766C524.08 351.159 529.737 351.159 533.252 347.645C536.766 344.13 536.766 338.473 536.766 327.159V103.159C536.766 91.846 536.766 86.189 533.252 82.674C529.737 79.159 524.08 79.159 512.766 79.16Z"
                        className="fill-krikkit-surface stroke-krikkit-line"
                        strokeWidth="1"
                    />
                    <path
                        d="M535.59 78.743 487.973 42.878 558.738 13.952C562.902 12.249 564.984 11.398 567.143 11.56C569.301 11.721 571.233 12.872 575.098 15.175L590.22 24.183C603.923 32.347 610.775 36.429 610.372 42.078C609.97 47.727 602.609 50.796 587.887 56.935L535.59 78.743Z"
                        className="fill-krikkit-soft/70 stroke-krikkit-line"
                        strokeWidth="0.8"
                    />
                    <path
                        d="M123.116 79.115 171.548 42.878 97.272 12.516C94.831 11.519 93.61 11.02 92.345 11.114C91.079 11.209 89.947 11.884 87.681 13.233L56.155 32.015C48.183 36.764 44.197 39.139 44.421 42.438C44.644 45.737 48.913 47.553 57.452 51.185L123.116 79.115Z"
                        className="fill-krikkit-soft/70 stroke-krikkit-line"
                        strokeWidth="0.8"
                    />
                    <path
                        d="M487.973 42.877 171.548 42.878 123.116 79.114 535.59 78.742 487.973 42.877Z"
                        className="fill-krikkit-muted/25"
                    />
                    <path
                        d="M171.548 78.909V42.877L123.116 79.114 171.548 78.909Z"
                        className="fill-krikkit-fg/10"
                    />
                    <path
                        d="M487.973 78.909V42.877L536.404 79.114 487.973 78.909Z"
                        className="fill-krikkit-fg/10"
                    />
                </svg>

                <div
                    className="absolute inset-0 z-10 flex items-center justify-center"
                    style={{ paddingBottom: '42%' }}
                >
                    {outgoing && outgoing.id !== shown.id ? (
                        <ChipCard key={`out-${outgoing.id}`} chip={outgoing} phase="out" />
                    ) : null}
                    <ChipCard key={`in-${shown.id}`} chip={shown} phase="in" />
                </div>

                <div
                    className="pointer-events-none absolute inset-0 z-[19] bg-krikkit-canvas/20"
                    style={{
                        clipPath: 'polygon(18.8% 22.5%, 81.8% 22.5%, 89.8% 54.4%, 10.2% 54.4%)',
                        backdropFilter: 'blur(22px)',
                        WebkitBackdropFilter: 'blur(22px)',
                    }}
                />

                <svg
                    className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-hidden"
                    viewBox="0 0 655 352"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M512.766 79.16H147.766C136.453 79.16 130.796 79.16 127.281 82.677C123.766 86.192 123.766 91.849 123.766 103.162V327.159C123.766 338.473 123.766 344.13 127.281 347.645C130.796 351.159 136.453 351.159 147.766 351.159H512.766C524.08 351.159 529.737 351.159 533.252 347.645C536.766 344.13 536.766 338.473 536.766 327.159V103.159C536.766 91.846 536.766 86.189 533.252 82.674C529.737 79.159 524.08 79.159 512.766 79.16Z"
                        className="fill-krikkit-surface"
                    />
                    <path
                        d="M74.601 164.033 123.116 79.114 535.59 78.742 581.532 164.469C588.006 176.55 591.243 182.59 588.568 187.06C585.892 191.529 579.039 191.529 565.333 191.529H90.559C76.476 191.529 69.434 191.529 66.778 186.953C64.122 182.376 67.615 176.262 74.601 164.033Z"
                        className="fill-krikkit-canvas/55 stroke-krikkit-line"
                        strokeWidth="1"
                    />
                </svg>
            </div>
            <span className="sr-only">{shown.title}</span>
        </div>
    )
}
