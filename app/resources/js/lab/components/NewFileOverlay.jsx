import { useEffect, useRef, useState } from 'react'

/**
 * Name a blank file, then create it in the workspace VFS.
 */
export function NewFileOverlay({
    open = false,
    defaultPath = 'src/untitled.tsx',
    onClose,
    onCreate,
}) {
    const inputRef = useRef(null)
    const [path, setPath] = useState(defaultPath)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (! open) return undefined
        setPath(defaultPath)
        setError('')
        setBusy(false)
        const id = window.requestAnimationFrame(() => {
            const el = inputRef.current
            if (! el) return
            el.focus()
            const slash = defaultPath.lastIndexOf('/') + 1
            const dot = defaultPath.lastIndexOf('.')
            if (dot > slash) el.setSelectionRange(slash, dot)
            else el.select()
        })
        return () => window.cancelAnimationFrame(id)
    }, [open, defaultPath])

    const submit = async () => {
        if (busy) return
        setBusy(true)
        setError('')
        const result = await onCreate?.(path)
        if (result?.ok) {
            onClose?.()
            return
        }
        setError(result?.error || 'Could not create that file.')
        setBusy(false)
        inputRef.current?.focus()
    }

    useEffect(() => {
        if (! open) return undefined
        const onKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose?.()
            }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [open, onClose])

    if (! open) return null

    return (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[18vh]" data-lab-workspace-palette>
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Dismiss"
                onClick={onClose}
            />
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-file-title"
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-krikkit-line bg-krikkit-canvas p-5"
                onSubmit={(event) => {
                    event.preventDefault()
                    submit()
                }}
            >
                <h2 id="new-file-title" className="text-base font-semibold text-krikkit-fg">
                    New file
                </h2>
                <p className="mt-1 text-sm text-krikkit-muted">
                    Create a blank file under <span className="text-krikkit-fg">src/</span> or <span className="text-krikkit-fg">public/</span>.
                </p>
                <input
                    ref={inputRef}
                    type="text"
                    value={path}
                    onChange={(event) => {
                        setPath(event.target.value)
                        if (error) setError('')
                    }}
                    spellCheck={false}
                    autoComplete="off"
                    className="mt-4 h-10 w-full rounded-full border border-transparent bg-krikkit-surface px-4 font-mono text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle focus:border-krikkit-muted/40"
                    placeholder="src/untitled.tsx"
                />
                {error ? (
                    <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-2 text-sm text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy || ! path.trim()}
                        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {busy ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </form>
        </div>
    )
}
