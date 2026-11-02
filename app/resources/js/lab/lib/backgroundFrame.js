/**
 * Frame scheduling that survives background-tab throttling.
 *
 * Browsers pause `requestAnimationFrame` when the document is hidden, which
 * freezes faux-streams and wait loops until the tab is focused again.
 * While visible → rAF; while hidden → setTimeout (wall-clock). Re-arm on
 * `visibilitychange` so a paused rAF cannot stall the loop.
 *
 * @returns {{
 *   schedule: (cb: (now: number) => void) => void,
 *   cancel: () => void,
 * }}
 */
export function createBackgroundFrameLoop() {
    let cancelled = false
    let rafId = 0
    let timeoutId = 0
    /** @type {((now: number) => void)|null} */
    let pending = null

    const clear = () => {
        if (rafId) {
            cancelAnimationFrame(rafId)
            rafId = 0
        }
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = 0
        }
    }

    const fire = (now) => {
        if (cancelled) return
        const cb = pending
        pending = null
        clear()
        cb?.(typeof now === 'number' ? now : performance.now())
    }

    const arm = () => {
        if (cancelled || ! pending) return
        clear()
        if (typeof document !== 'undefined' && document.hidden) {
            // Hidden tabs pause rAF; timeouts still fire (often ~1s clamped).
            timeoutId = setTimeout(() => fire(performance.now()), 32)
            return
        }
        if (typeof requestAnimationFrame === 'function') {
            rafId = requestAnimationFrame(fire)
            return
        }
        timeoutId = setTimeout(() => fire(performance.now()), 16)
    }

    const onVisibility = () => {
        if (cancelled || ! pending) return
        // Don't wait on throttled background timers — run the pending tick now
        // so streamReveal can flush and waitUntil can observe wall-clock timeout.
        if (typeof document !== 'undefined' && document.hidden) {
            fire(performance.now())
            return
        }
        arm()
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibility)
    }

    return {
        schedule(cb) {
            if (cancelled) return
            pending = cb
            arm()
        },
        cancel() {
            cancelled = true
            pending = null
            clear()
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility)
            }
        },
    }
}

/** True when the document is backgrounded (rAF will not run). */
export function isDocumentHidden() {
    return typeof document !== 'undefined' && Boolean(document.hidden)
}
