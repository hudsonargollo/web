/**
 * Confirm closing a dirty editor tab.
 */
export function UnsavedCloseModal({
    open = false,
    fileLabel = 'this file',
    onSave,
    onDiscard,
    onCancel,
}) {
    if (! open) return null

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Dismiss"
                onClick={onCancel}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="unsaved-close-title"
                className="relative w-full max-w-md rounded-2xl border border-krikkit-line bg-krikkit-canvas p-5"
            >
                <h2 id="unsaved-close-title" className="text-base font-semibold text-krikkit-fg">
                    Unsaved changes
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-krikkit-muted">
                    <span className="font-medium text-krikkit-fg">{fileLabel}</span>
                    {' '}has edits that aren’t saved yet. What should we do?
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg px-3 py-2 text-sm text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onDiscard}
                        className="rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                    >
                        Don’t save
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}
