/**
 * Quiet empty preview surface — panel chrome stays; no live runtime.
 */
export function PreviewIdle() {
    return (
        <div
            className="h-full min-h-0 bg-krikkit-canvas"
            aria-label="Preview"
        />
    )
}
