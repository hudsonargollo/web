/**
 * Shown when Lab credits are exhausted for the current month.
 */
export function CreditExhaustedNotice({
    open = false,
    message = '',
    upgradeUrl = '/dashboard/packs',
    onClose,
}) {
    if (! open) return null

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Dismiss"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="lab-credits-exhausted-title"
                className="relative w-full max-w-md rounded-2xl border border-krikkit-line bg-krikkit-canvas p-5"
            >
                <h2 id="lab-credits-exhausted-title" className="text-base font-semibold text-krikkit-fg">
                    Credits exhausted
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-krikkit-muted">
                    {message || 'You have used all Lab credits on your pack this month. Upgrade your pack for a larger monthly credit pool.'}
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-2 text-sm text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                    >
                        Dismiss
                    </button>
                    <a
                        href={upgradeUrl}
                        className="inline-flex items-center rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
                    >
                        View packs
                    </a>
                </div>
            </div>
        </div>
    )
}
