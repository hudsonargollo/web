import { Image, Link2, SquareDashedTopSolid, Type } from 'lucide-react'
import { friendlyPillLabel } from '../lib/previewEditTargets'
import { IconClose } from './Icons'

const ICONS = {
    type: Type,
    card: SquareDashedTopSolid,
    link: Link2,
    image: Image,
}

/**
 * Inspect targets — icon and label share one cap-height; no raw HTML tags.
 */
export function ComposerEditPills({
    targets = [],
    onRemove,
    disabled = false,
    align = 'start',
    variant = 'composer',
    className = '',
}) {
    if (! targets.length) return null

    const bubble = variant === 'bubble'

    return (
        <div
            className={[
                'flex max-w-full flex-wrap gap-1',
                align === 'end' ? 'justify-end' : '',
                onRemove && ! bubble ? 'mb-2' : '',
                className,
            ].filter(Boolean).join(' ')}
        >
            {targets.map((target) => {
                const Icon = ICONS[target.icon] || SquareDashedTopSolid
                const label = friendlyPillLabel(target)
                return (
                    <span
                        key={target.id}
                        title={label}
                        className={[
                            'inline-flex max-w-full items-center',
                            bubble
                                ? 'h-5 max-w-[10rem] gap-1 rounded-md bg-accent-foreground/12 px-1.5 text-[10px] leading-none text-accent-foreground'
                                : 'h-6 max-w-[12rem] gap-1.5 rounded-md border border-krikkit-line bg-krikkit-soft pl-1.5 pr-1 text-[11px] leading-none text-krikkit-fg',
                        ].join(' ')}
                    >
                        <Icon
                            className={[
                                'block size-2.5 shrink-0',
                                bubble ? 'opacity-70' : 'text-krikkit-muted',
                            ].join(' ')}
                            strokeWidth={2}
                            aria-hidden
                        />
                        <span className="min-w-0 truncate leading-none">{label}</span>
                        {onRemove && ! bubble ? (
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onRemove(target.id)}
                                className="inline-flex size-4 shrink-0 items-center justify-center rounded text-krikkit-subtle transition-colors hover:text-krikkit-fg disabled:opacity-40"
                                aria-label={`Remove ${label}`}
                            >
                                <IconClose className="size-2.5" />
                            </button>
                        ) : null}
                    </span>
                )
            })}
        </div>
    )
}
