import { IconClose } from './Icons'
import { formatBytes, isImageAttachment } from '../lib/attachments'

export function AttachmentChip({ attachment, onRemove, disabled = false, size = 'md' }) {
    const dims = size === 'sm' ? 'h-16 w-16' : size === 'lg' ? 'h-24 w-24' : 'h-20 w-20'
    const image = isImageAttachment(attachment)

    return (
        <div
            className={[
                'group relative shrink-0 overflow-hidden rounded-xl border border-krikkit-line bg-krikkit-soft',
                dims,
            ].join(' ')}
        >
            {image ? (
                <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-between px-1.5 py-1.5">
                    <div
                        className={[
                            'mt-0.5 flex h-7 w-7 items-center justify-center rounded-md text-[9px] font-semibold tracking-wide',
                            attachment.toneClass || 'bg-krikkit-soft text-krikkit-fg-soft',
                        ].join(' ')}
                        title={attachment.label || 'FILE'}
                    >
                        {(attachment.label || 'FILE').slice(0, 4)}
                    </div>

                    <p
                        className="w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight text-krikkit-fg"
                        title={attachment.name}
                    >
                        {attachment.name}
                    </p>

                    <p className="text-[9px] leading-none text-krikkit-muted">
                        {formatBytes(attachment.size)}
                    </p>
                </div>
            )}

            {onRemove && (
                <button
                    type="button"
                    onClick={() => onRemove(attachment.id)}
                    disabled={disabled}
                    className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-md bg-krikkit-surface text-krikkit-fg opacity-100 transition hover:bg-krikkit-soft sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`Remove ${attachment.name}`}
                >
                    <IconClose className="h-3 w-3" />
                </button>
            )}
        </div>
    )
}

export function AttachmentGallery({
    attachments,
    onRemove,
    disabled = false,
    size = 'md',
    align = 'start',
}) {
    if (! attachments?.length) {
        return null
    }

    return (
        <div
            className={[
                'flex max-w-full flex-wrap gap-2',
                align === 'end' ? 'justify-end' : 'justify-start',
            ].join(' ')}
        >
            {attachments.map((attachment) => (
                <AttachmentChip
                    key={attachment.id}
                    attachment={attachment}
                    onRemove={onRemove}
                    disabled={disabled}
                    size={size}
                />
            ))}
        </div>
    )
}
