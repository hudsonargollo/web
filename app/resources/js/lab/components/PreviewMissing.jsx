import { LAB_BTN_OUTLINE } from '../lib/labConstants'

/**
 * Preview 404 — same quiet Lab chrome as empty stages, no shadows.
 */
export function PreviewMissing({ path = '/', onHome }) {
    return (
        <div
            className="absolute inset-0 flex items-center justify-center bg-krikkit-canvas px-6"
            role="status"
            aria-label="Page not found"
        >
            <div className="flex w-full max-w-xs flex-col items-center text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent-content">
                    Not found
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-krikkit-fg">
                    404
                </p>
                <p className="mt-2 text-sm leading-relaxed text-krikkit-muted">
                    This page isn’t in the project.
                </p>
                <p
                    className="mt-5 inline-flex h-7 max-w-full items-center rounded-lg border border-krikkit-line px-2.5 font-mono text-xs text-krikkit-subtle"
                    title={path}
                >
                    <span className="truncate">{path}</span>
                </p>
                {onHome ? (
                    <button
                        type="button"
                        onClick={onHome}
                        className={`mt-5 inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium ${LAB_BTN_OUTLINE}`}
                    >
                        Homepage
                    </button>
                ) : null}
            </div>
        </div>
    )
}
