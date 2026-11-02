export const PUBLISH_MEMORY_EVENT = 'krikkit-publish-memory'

/**
 * Free browser memory before a production build (preview iframe, etc.).
 */
export function suspendLabMemoryForPublish() {
    if (typeof window === 'undefined') return
    try {
        window.dispatchEvent(new CustomEvent(PUBLISH_MEMORY_EVENT, {
            detail: { suspended: true, at: Date.now() },
        }))
    } catch {
        /* ignore */
    }
}

/**
 * Restore Lab surfaces after publish finishes or fails.
 */
export function resumeLabMemoryAfterPublish() {
    if (typeof window === 'undefined') return
    try {
        window.dispatchEvent(new CustomEvent(PUBLISH_MEMORY_EVENT, {
            detail: { suspended: false, at: Date.now() },
        }))
    } catch {
        /* ignore */
    }
}

export function sleepMs(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, Math.max(0, Number(ms) || 0))
    })
}
