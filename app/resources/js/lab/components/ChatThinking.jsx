import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { formatLabElapsed, parseLabTimestamp } from '../lib/labElapsed'
import { ToolStatusText } from './ToolStatusText'
import { IconChevron, IconBrain } from './toolIcons'

const AUTO_CLOSE_DELAY = 1000

function thinkingLabel(isStreaming, duration) {
    if (isStreaming) return 'Thinking…'
    if (duration == null || duration === 0) return 'Thought for a few seconds'
    return `Thought for ${duration}s`
}

function findScrollParent(el) {
    let node = el?.parentElement
    while (node && node !== document.body) {
        const style = window.getComputedStyle(node)
        const oy = style.overflowY
        // Prefer the chat lane even when shelf slack means it isn't overflowing yet —
        // expand growth is what creates the need to scroll.
        if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') {
            return node
        }
        node = node.parentElement
    }
    return null
}

/**
 * Keep the Thinking header fixed in the viewport and grow the panel downward
 * by scrolling the chat lane down by the header's upward jump + any overflow.
 *
 * @param {number} pinnedTop — header getBoundingClientRect().top from *before* open
 */
function expandDownward(root, panel, pinnedTop) {
    if (! root || pinnedTop == null) return
    const lane = findScrollParent(root)
    if (! lane) return

    const sync = () => {
        const afterTop = root.getBoundingClientRect().top
        // Header drifted up → scroll down so expansion reads as opening below.
        const drift = afterTop - pinnedTop
        if (drift < -0.5) {
            lane.scrollTop -= drift
        }

        if (panel) {
            const laneRect = lane.getBoundingClientRect()
            const panelBottom = panel.getBoundingClientRect().bottom
            const pad = 12
            if (panelBottom > laneRect.bottom - pad) {
                lane.scrollTop += panelBottom - (laneRect.bottom - pad)
            }
        }
    }

    // Collapse uses CSS grid + transitions — measure after layout + during tween.
    sync()
    requestAnimationFrame(() => {
        sync()
        requestAnimationFrame(sync)
        window.setTimeout(sync, 300)
    })
}

/**
 * Lab thinking row. Stays collapsed until the user opens it.
 * If open when streaming ends, auto-collapses once.
 */
export function ChatThinking({
    isStreaming = false,
    duration,
    startedAt = null,
    content = '',
    forceCollapsed = false,
    onOpenChange,
}) {
    const panelId = useId()
    const rootRef = useRef(null)
    const panelRef = useRef(null)
    /** @type {React.MutableRefObject<number|null>} header top pinned before expand */
    const expandPinRef = useRef(null)
    const [isOpen, setIsOpen] = useState(false)
    const [hasAutoClosed, setHasAutoClosed] = useState(false)
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        if (! isStreaming) return undefined
        const tick = window.setInterval(() => setNow(Date.now()), 100)
        return () => window.clearInterval(tick)
    }, [isStreaming])

    useEffect(() => {
        if (! forceCollapsed) return undefined
        setIsOpen(false)
        return undefined
    }, [forceCollapsed])

    // If the user expanded it, fold once after streaming ends.
    useEffect(() => {
        if (forceCollapsed || isStreaming || ! isOpen || hasAutoClosed) {
            return undefined
        }

        const timer = window.setTimeout(() => {
            setIsOpen(false)
            setHasAutoClosed(true)
        }, AUTO_CLOSE_DELAY)

        return () => window.clearTimeout(timer)
    }, [isStreaming, isOpen, hasAutoClosed])

    // After open paints, scroll the lane so the body opens downward (not upward).
    useLayoutEffect(() => {
        if (! isOpen || expandPinRef.current == null) return undefined
        const pinnedTop = expandPinRef.current
        expandPinRef.current = null
        expandDownward(rootRef.current, panelRef.current, pinnedTop)
        return undefined
    }, [isOpen])

    const handleOpenChange = (next) => {
        setHasAutoClosed(true)
        if (next && rootRef.current) {
            expandPinRef.current = rootRef.current.getBoundingClientRect().top
        } else {
            expandPinRef.current = null
        }
        setIsOpen(next)
        onOpenChange?.(next)
    }

    const label = thinkingLabel(isStreaming, duration)
    const canExpand = Boolean(content) || isStreaming
    const showLiveClock = isStreaming && startedAt != null

    return (
        <div ref={rootRef} className="min-w-0">
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={canExpand && isOpen ? panelId : undefined}
                onClick={() => handleOpenChange(! isOpen)}
                className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit group text-krikkit-muted transition-colors hover:text-krikkit-fg-soft"
            >
                <IconBrain />
                <span className="inline-flex h-5 min-w-0 flex-none items-center overflow-hidden text-ellipsis whitespace-nowrap leading-5">
                    <ToolStatusText text={label} pending={isStreaming} />
                </span>
                {showLiveClock ? (
                    <span className="font-mono text-[12px] text-krikkit-subtle tabular-nums">
                        {formatLabElapsed(now - parseLabTimestamp(startedAt))}
                    </span>
                ) : null}
                {canExpand ? <IconChevron open={isOpen} className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>

            {canExpand && isOpen ? (
                <div
                    ref={panelRef}
                    id={panelId}
                    data-state="open"
                    className="lab-tool-collapse lab-think-content text-sm text-krikkit-muted outline-none"
                >
                    <div className="lab-tool-collapse__clip">
                        <div className="lab-tool-collapse__body whitespace-pre-wrap break-normal [overflow-wrap:break-word] hyphens-none border-l border-krikkit-line pl-3 text-xs leading-relaxed text-krikkit-subtle">
                            {content || (isStreaming ? '…' : '')}
                            <span
                                className={[
                                    'lab-think-caret ml-0.5 inline-block w-[0.5ch]',
                                    isStreaming && content ? '' : 'invisible',
                                ].join(' ')}
                                aria-hidden
                            >
                                ▍
                            </span>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
