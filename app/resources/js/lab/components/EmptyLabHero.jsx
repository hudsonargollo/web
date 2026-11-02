import { RefreshCw } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { LAB_BTN_OUTLINE, pickRandomSeeds, SEEDS, seedIsCustomizable } from '../lib/labConstants'
import { LabTooltip } from './LabTooltip'
import { SeedCustomizeModal } from './SeedCustomizeModal'
import { SeedIcon } from './SeedIcon'
import { LabGlyph } from './Icons'

const SEED_MAX = 4

function nextSeeds() {
    return pickRandomSeeds(Math.min(SEED_MAX, SEEDS.length))
}

export function EmptyLabHero({ live }) {
    return (
        <div
            className={[
                'lab-layout-pane mx-auto w-full max-w-2xl overflow-hidden px-4 sm:px-6',
                live ? 'mb-0 max-h-0 -translate-y-3 opacity-0' : 'mb-8 max-h-56 opacity-100',
            ].join(' ')}
            aria-hidden={live}
        >
            <div className="text-center">
                <p className="mb-3 inline-flex h-5 items-center justify-center gap-1.5 text-xs font-medium uppercase leading-none tracking-[0.18em] text-krikkit-accent">
                    <LabGlyph />
                    Lab
                </p>
                <h1 className="mb-3 text-3xl font-semibold tracking-tight text-krikkit-fg sm:text-4xl">
                    What should we build?
                </h1>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-krikkit-muted">
                    Describe the site or product. We’ll shape the idea here first — the build workspace opens when you’re ready.
                </p>
            </div>
        </div>
    )
}

function SeedChipButton({ seed, onPickSeed, className = '' }) {
    return (
        <button
            type="button"
            onClick={() => onPickSeed(seed)}
            className={[
                'inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-medium',
                LAB_BTN_OUTLINE,
                className,
            ].join(' ')}
        >
            <SeedIcon name={seed.icon} className="size-3.5 shrink-0 opacity-70" />
            <span className="whitespace-nowrap">{seed.title}</span>
        </button>
    )
}

export function SeedChips({ live, onPickSeed, padded = true }) {
    const [seeds, setSeeds] = useState(nextSeeds)
    const [batch, setBatch] = useState(0)
    const [customSeed, setCustomSeed] = useState(null)
    const hostRef = useRef(null)
    const measureRef = useRef(null)
    const reloadRef = useRef(null)
    const [visibleCount, setVisibleCount] = useState(SEED_MAX)

    const pickSeed = useCallback((seed) => {
        if (seedIsCustomizable(seed)) {
            setCustomSeed(seed)
            return
        }
        onPickSeed?.(seed.prompt)
    }, [onPickSeed])

    const reshuffle = useCallback(() => {
        setSeeds(nextSeeds())
        setBatch((n) => n + 1)
    }, [])

    useLayoutEffect(() => {
        if (live) return undefined

        const host = hostRef.current
        const measure = measureRef.current
        if (! host || ! measure) return undefined

        const fit = () => {
            const maxW = host.clientWidth
            const kids = Array.from(measure.children)
            const reloadW = reloadRef.current?.getBoundingClientRect().width || 32
            if (! kids.length || maxW <= 0) {
                setVisibleCount(1)
                return
            }

            const styles = window.getComputedStyle(measure)
            const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0
            // Chips + reload share one centered group — reserve reload + trailing gap.
            const chipBudget = Math.max(0, maxW - reloadW - gap)
            let used = 0
            let count = 0

            for (const child of kids) {
                const width = child.getBoundingClientRect().width
                const next = count === 0 ? width : used + gap + width
                if (next > chipBudget + 0.5) break
                used = next
                count += 1
            }

            setVisibleCount(Math.max(1, Math.min(SEED_MAX, count)))
        }

        fit()
        const observer = new ResizeObserver(fit)
        observer.observe(host)
        return () => observer.disconnect()
    }, [live, seeds])

    const visible = seeds.slice(0, visibleCount)

    return (
        <>
            <div
                className={[
                    'lab-layout-pane mx-auto w-full overflow-hidden',
                    padded ? 'max-w-2xl px-4 sm:px-6' : '',
                    live ? 'mt-0 max-h-0 opacity-0' : 'mt-6 max-h-12 opacity-100',
                ].join(' ')}
                aria-hidden={live}
            >
                <div ref={hostRef} className="relative flex w-full justify-center">
                    <div
                        ref={measureRef}
                        className="pointer-events-none absolute left-0 top-0 flex w-max gap-2 opacity-0"
                        aria-hidden
                    >
                        {seeds.map((seed) => (
                            <SeedChipButton
                                key={`m-${batch}-${seed.title}`}
                                seed={seed}
                                onPickSeed={() => {}}
                            />
                        ))}
                    </div>

                    <div className="flex w-max max-w-full flex-nowrap items-center justify-center gap-2 overflow-hidden">
                        {visible.map((seed) => (
                            <SeedChipButton
                                key={`${batch}-${seed.title}`}
                                seed={seed}
                                onPickSeed={pickSeed}
                            />
                        ))}
                        <LabTooltip content="Refresh">
                            <button
                                ref={reloadRef}
                                type="button"
                                onClick={reshuffle}
                                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${LAB_BTN_OUTLINE}`}
                                aria-label="Refresh suggestions"
                            >
                                <RefreshCw className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                            </button>
                        </LabTooltip>
                    </div>
                </div>
            </div>

            <SeedCustomizeModal
                seed={customSeed}
                open={Boolean(customSeed) && ! live}
                onClose={() => setCustomSeed(null)}
                onApply={(prompt) => {
                    onPickSeed?.(prompt)
                    setCustomSeed(null)
                }}
            />
        </>
    )
}
