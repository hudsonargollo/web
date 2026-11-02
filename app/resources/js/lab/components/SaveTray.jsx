const AUTO_SAVE_KEY = 'krikkit.lab.autoSave'

/**
 * Bottom-right save tray — only when there are unsaved edits AND auto-save is off.
 */
export function SaveTray({
    visible = false,
    dirtyCount = 0,
    autoSave = false,
    saving = false,
    onSave,
    onToggleAutoSave,
    onDontSave,
}) {
    // Auto-save on → silent background writes; no tray flicker while typing.
    if (! visible || autoSave || dirtyCount === 0) return null

    return (
        <div className="pointer-events-none fixed right-4 bottom-4 z-[70] flex max-w-sm flex-col items-end gap-2">
            <div className="pointer-events-auto flex items-center gap-1 rounded-xl bg-krikkit-surface p-1.5">
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {saving ? 'Saving…' : dirtyCount > 1 ? `Save ${dirtyCount}` : 'Save'}
                </button>
                <button
                    type="button"
                    onClick={onToggleAutoSave}
                    aria-pressed={autoSave}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                >
                    Auto save
                </button>
                <button
                    type="button"
                    onClick={onDontSave}
                    disabled={saving}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Don’t save
                </button>
            </div>
            <p className="pointer-events-none text-[11px] text-krikkit-subtle">
                Unsaved changes · Ctrl+S to save
            </p>
        </div>
    )
}

export function readStoredAutoSave() {
    try {
        return window.localStorage.getItem(AUTO_SAVE_KEY) === '1'
    } catch {
        return false
    }
}

export function writeStoredAutoSave(enabled) {
    try {
        window.localStorage.setItem(AUTO_SAVE_KEY, enabled ? '1' : '0')
    } catch {
        /* ignore quota / private mode */
    }
}
