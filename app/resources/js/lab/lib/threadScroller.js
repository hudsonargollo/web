/**
 * Lab reply-thread scroller.
 * Slack lives on the active reply block (min-height); growth follow sticks
 * to maxScrollTop so empty shelf slack never pulls back to the user bubble.
 */

const CLING_SLACK_PX = 40
const SETTLE_MS = 500

function cosineOut(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)))
}

function readPaddingBottom(node) {
    if (! node || typeof window === 'undefined') return 56
    const raw = window.getComputedStyle(node).paddingBottom
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) ? n : 56
}

export class ThreadScroller {
    #epoch = 0
    #raf = 0
    #pendingDone = null

    get animating() {
        return this.#raf !== 0
    }

    #flushDone() {
        const done = this.#pendingDone
        this.#pendingDone = null
        done?.()
    }

    stop() {
        this.#epoch += 1
        if (this.#raf) {
            cancelAnimationFrame(this.#raf)
            this.#raf = 0
        }
        this.#flushDone()
    }

    /** Document Y of `block` relative to the scrollport. */
    blockOrigin(block, scrollport) {
        const a = block.getBoundingClientRect()
        const b = scrollport.getBoundingClientRect()
        return a.top - b.top + scrollport.scrollTop
    }

    maxScrollTop(scrollport) {
        return Math.max(0, scrollport.scrollHeight - scrollport.clientHeight)
    }

    huggingTail(scrollport, slack = CLING_SLACK_PX) {
        return scrollport.scrollTop >= this.maxScrollTop(scrollport) - slack
    }

    /**
     * Height the active reply block should reserve so
     * origin + block + stack paddingBottom fills the scrollport once.
     */
    shelfExtent(scrollport, stackEl) {
        const view = scrollport?.clientHeight || 0
        if (view < 1) return 0
        const pad = readPaddingBottom(stackEl)
        return Math.max(0, Math.floor(view - pad) - 1)
    }

    /** Instant or cosine-eased scrollTop move. */
    settle(scrollport, y, { ms = SETTLE_MS, done } = {}) {
        this.#flushDone()
        const epoch = ++this.#epoch
        if (this.#raf) {
            cancelAnimationFrame(this.#raf)
            this.#raf = 0
        }

        this.#pendingDone = typeof done === 'function' ? done : null

        const finish = () => {
            if (epoch !== this.#epoch) return
            this.#raf = 0
            this.#flushDone()
        }

        const goal = Math.max(0, Math.min(y, this.maxScrollTop(scrollport)))
        const from = scrollport.scrollTop
        const delta = goal - from

        if (Math.abs(delta) < 0.75 || ms <= 0) {
            scrollport.scrollTop = goal
            finish()
            return
        }

        const t0 = performance.now()
        const step = (now) => {
            if (epoch !== this.#epoch) return
            const u = cosineOut((now - t0) / ms)
            scrollport.scrollTop = from + delta * u
            if (u < 1) {
                this.#raf = requestAnimationFrame(step)
                return
            }
            scrollport.scrollTop = goal
            finish()
        }
        this.#raf = requestAnimationFrame(step)
    }

    /** Follow stream growth — true scroll extent only (ignores shelf min-height). */
    stickTail(scrollport, { ms = 0, done } = {}) {
        this.settle(scrollport, this.maxScrollTop(scrollport), { ms, done })
    }

    /** ResizeObserver → single rAF. Returns disposer. */
    onBoxChange(node, fn) {
        let pending = 0
        const fire = () => {
            pending = 0
            fn()
        }
        const schedule = () => {
            if (pending) return
            pending = requestAnimationFrame(fire)
        }
        const ro = new ResizeObserver(schedule)
        ro.observe(node)
        return () => {
            ro.disconnect()
            if (pending) cancelAnimationFrame(pending)
        }
    }
}
