import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ThreadScroller } from '../lib/threadScroller'

/** Empty → live chat layout morph duration (matches `.lab-layout-pane`). */
const RAIL_MORPH_MS = 550
const GATE_NUDGE_MS = 280

/**
 * Owns Lab chat scroll: shelf min-height on the active reply, settle-to-top on send,
 * stick-to-maxScrollTop while the reader is already at the bottom.
 */
export function useReplyShelf({
    live,
    building,
    busy,
    turns,
    latestTurn,
    anchorId,
    laneRef,
    latestRef,
    bubbleRefs,
    stackRef,
    hasHistory,
}) {
    const [laneH, setLaneH] = useState(0)
    const [shelfTurnId, setShelfTurnId] = useState(null)
    const [showFollowButton, setShowFollowButton] = useState(false)

    const clingRef = useRef(false)
    const settledRef = useRef(null)
    const settlingRef = useRef(null)
    const openTailRef = useRef(Boolean(hasHistory))
    const turnsLenRef = useRef(turns.length)
    turnsLenRef.current = turns.length
    const engineRef = useRef(null)
    if (! engineRef.current) engineRef.current = new ThreadScroller()

    const engine = engineRef.current
    const laneReady = laneH > 0

    const syncFollowUi = useCallback(() => {
        const lane = laneRef.current
        if (! live || ! lane) {
            setShowFollowButton(false)
            return
        }
        const canScroll = engine.maxScrollTop(lane) > 8
        // Crest park can sit at maxScroll without cling — don't treat that as following.
        const following = clingRef.current || (
            engine.huggingTail(lane) && ! (settledRef.current && ! clingRef.current)
        )
        setShowFollowButton(Boolean(canScroll && ! following && ! settlingRef.current))
    }, [live, laneRef, engine])

    useLayoutEffect(() => {
        if (shelfTurnId != null) return
        const last = turns[turns.length - 1]
        if (last) setShelfTurnId(last.id)
    }, [turns, shelfTurnId])

    useEffect(() => {
        if (! live) return undefined
        const lane = laneRef.current
        if (! lane) return undefined

        const measure = () => setLaneH(lane.clientHeight)
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(lane)
        return () => ro.disconnect()
    }, [live, building, laneRef])

    useEffect(() => {
        if (! live) return undefined
        const lane = laneRef.current
        if (! lane) return undefined

        // Only real reader input breaks follow — layout / stickTail must not.
        let gestureUntil = 0
        const markGesture = () => {
            gestureUntil = performance.now() + 500
        }

        const onScroll = () => {
            if (settlingRef.current || engine.animating) return

            if (engine.huggingTail(lane)) {
                // Crest settle often parks scrollTop ≈ maxScroll because the active
                // shelf min-height fills the port. That is NOT "follow the stream" —
                // arming cling here lets stickTail yank the user bubble off the crest
                // as soon as tools/repair cards grow (Fix with AI / Switch).
                const crestPark = Boolean(settledRef.current) && ! clingRef.current
                const readerGesture = performance.now() < gestureUntil
                if (crestPark && ! readerGesture) {
                    syncFollowUi()
                    return
                }
                clingRef.current = true
                syncFollowUi()
                return
            }

            if (performance.now() < gestureUntil) {
                clingRef.current = false
            }
            syncFollowUi()
        }

        lane.addEventListener('scroll', onScroll, { passive: true })
        lane.addEventListener('wheel', markGesture, { passive: true })
        lane.addEventListener('touchmove', markGesture, { passive: true })
        lane.addEventListener('pointerdown', markGesture, { passive: true })
        return () => {
            lane.removeEventListener('scroll', onScroll)
            lane.removeEventListener('wheel', markGesture)
            lane.removeEventListener('touchmove', markGesture)
            lane.removeEventListener('pointerdown', markGesture)
        }
    }, [live, building, laneRef, engine, syncFollowUi])

    useEffect(() => () => engine.stop(), [engine])

    // Deep-link / F5: park the latest user message at the crest.
    // Tail-jump + shelf minHeight hid Switch (and short) turns above the fold.
    useLayoutEffect(() => {
        if (! openTailRef.current) return undefined
        if (! live || ! laneReady || ! latestTurn?.id) return undefined
        const lane = laneRef.current
        if (! lane) return undefined

        let focusId = latestTurn.id
        for (let i = turns.length - 1; i >= 0; i -= 1) {
            const turn = turns[i]
            if (
                turn?.user?.autoRepair
                || turn?.user?.text?.trim()
                || turn?.user?.files?.length
            ) {
                focusId = turn.id
                break
            }
        }

        const dock = () => {
            const port = laneRef.current
            const node = bubbleRefs.current[focusId]
            if (! port || ! node) return false
            port.scrollTop = Math.max(0, engine.blockOrigin(node, port))
            return true
        }

        if (dock()) {
            clingRef.current = false
        } else {
            lane.scrollTop = engine.maxScrollTop(lane)
            clingRef.current = true
        }
        settledRef.current = focusId
        openTailRef.current = false
        syncFollowUi()

        // Shelf minHeight applies a frame later — re-dock once so the user stays visible.
        let cancelled = false
        const raf = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (cancelled || clingRef.current) return
                dock()
                syncFollowUi()
            })
        })
        const timer = window.setTimeout(() => {
            if (cancelled || clingRef.current) return
            dock()
            syncFollowUi()
        }, RAIL_MORPH_MS)

        return () => {
            cancelled = true
            cancelAnimationFrame(raf)
            window.clearTimeout(timer)
        }
    }, [live, laneReady, latestTurn?.id, turns, laneRef, bubbleRefs, engine, syncFollowUi])

    // Send → settle active reply to the top of the scrollport.
    // Narrow deps: laneH flicker must NOT cancel/restart the glide (that yanked to the user bubble).
    useLayoutEffect(() => {
        if (! anchorId || ! laneReady) return undefined
        if (settledRef.current === anchorId || settlingRef.current === anchorId) return undefined

        const lane = laneRef.current
        if (! lane) return undefined

        // AutoRepair / Switch turns can mount a frame late — retry briefly for the node.
        if (! bubbleRefs.current[anchorId]) {
            let cancelled = false
            const raf = requestAnimationFrame(() => {
                if (cancelled) return
                // Re-enter via settled/settling guards on the next layout by bumping nothing —
                // call run path directly once the ref exists.
                const port = laneRef.current
                const block = bubbleRefs.current[anchorId]
                if (! port || ! block) return
                if (settledRef.current === anchorId || settlingRef.current === anchorId) return
                settlingRef.current = anchorId
                clingRef.current = false
                setShowFollowButton(false)
                const y = Math.max(0, engine.blockOrigin(block, port))
                port.scrollTop = y
                settledRef.current = anchorId
                settlingRef.current = null
                syncFollowUi()
            })
            return () => {
                cancelled = true
                cancelAnimationFrame(raf)
            }
        }

        const isFirst = turnsLenRef.current === 1
        const delay = isFirst ? RAIL_MORPH_MS : 0
        settlingRef.current = anchorId
        clingRef.current = false
        setShowFollowButton(false)

        let cancelled = false
        const markDone = () => {
            if (cancelled) return
            settledRef.current = anchorId
            settlingRef.current = null
            // Stay on the crest. Arming cling because a short shelf ≈ maxScroll
            // made tool growth stickTail and lifted the Switch user bubble away.
            syncFollowUi()
        }

        const run = () => {
            if (cancelled) return
            const port = laneRef.current
            const block = bubbleRefs.current[anchorId]
            if (! port || ! block) {
                settlingRef.current = null
                return
            }
            const y = Math.max(0, engine.blockOrigin(block, port))
            if (isFirst || Math.abs(port.scrollTop - y) < 1) {
                port.scrollTop = y
                markDone()
                return
            }
            engine.settle(port, y, { done: markDone })
        }

        if (delay > 0) {
            const timer = window.setTimeout(run, delay)
            return () => {
                cancelled = true
                window.clearTimeout(timer)
                if (settlingRef.current === anchorId && settledRef.current !== anchorId) {
                    settlingRef.current = null
                }
            }
        }

        run()
        return () => {
            cancelled = true
            // Only tear down when this send is superseded (anchor change / unmount).
            if (settlingRef.current === anchorId && settledRef.current !== anchorId) {
                engine.stop()
                settlingRef.current = null
            }
        }
    }, [anchorId, laneReady, laneRef, bubbleRefs, engine, syncFollowUi])

    // Growth: stick to maxScrollTop while clinging (never aim at shelf box bottom).
    // Also while busy=false briefly after resume — mermaid/finalize still grows.
    useEffect(() => {
        if (! live) return undefined
        const lane = laneRef.current
        const el = latestRef.current
        if (! lane || ! el) return undefined

        return engine.onBoxChange(el, () => {
            if (settlingRef.current) return
            if (! settledRef.current || ! clingRef.current) return
            // Don't fight an in-flight crest settle; resume uses ms:0 so this stays free.
            if (engine.animating) return

            const max = engine.maxScrollTop(lane)
            if (Math.abs(lane.scrollTop - max) < 1) return
            engine.stickTail(lane, { ms: 0 })
        })
    }, [busy, live, anchorId, shelfTurnId, laneRef, latestRef, engine])

    // Stream just finished — Streamdown/mermaid finalize can shrink the box and the
    // browser clamps scrollTop up to the shelf crest (user bubble). Re-stick once.
    useLayoutEffect(() => {
        if (busy || ! live) return undefined
        if (! clingRef.current || settlingRef.current) return undefined
        const lane = laneRef.current
        if (! lane) return undefined

        let cancelled = false
        const kick = () => {
            if (cancelled || ! clingRef.current) return
            const port = laneRef.current
            if (! port) return
            engine.stickTail(port, { ms: 0 })
        }
        const raf = requestAnimationFrame(() => {
            requestAnimationFrame(kick)
        })
        const timer = window.setTimeout(kick, 120)
        return () => {
            cancelled = true
            cancelAnimationFrame(raf)
            window.clearTimeout(timer)
        }
    }, [busy, live, latestTurn?.id, latestTurn?.bot, latestTurn?.botFollowUp, latestTurn?.buildGate, laneRef, engine])

    // Build gate mount — one cling stick if the gate sits past the fold.
    useLayoutEffect(() => {
        if (busy || ! live || ! laneReady) return undefined
        if (latestTurn?.buildGate !== 'pending') return undefined
        if (! clingRef.current || engine.animating) return undefined

        let cancelled = false
        const raf = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (cancelled || ! clingRef.current) return
                const lane = laneRef.current
                const el = latestRef.current
                if (! lane || ! el) return
                const bottom = engine.blockOrigin(el, lane) + el.offsetHeight
                const viewBottom = lane.scrollTop + lane.clientHeight
                if (bottom <= viewBottom - 40) return
                engine.stickTail(lane, { ms: GATE_NUDGE_MS })
            })
        })
        return () => {
            cancelled = true
            cancelAnimationFrame(raf)
        }
    }, [busy, live, laneReady, latestTurn?.id, latestTurn?.buildGate, laneRef, latestRef, engine])

    // Skip gate — clamp overshoot.
    useLayoutEffect(() => {
        if (busy || ! live) return undefined
        if (latestTurn?.buildGate !== 'skipped') return undefined
        const lane = laneRef.current
        if (! lane) return undefined
        const max = engine.maxScrollTop(lane)
        if (lane.scrollTop > max) lane.scrollTop = max
        return undefined
    }, [busy, live, latestTurn?.id, latestTurn?.buildGate, laneRef, engine])

    // Workspace morph — re-dock once when the rail opens / shelf owner changes.
    // Never depend on `turns`: every stream token was resetting this timer and
    // yanking scrollTop back to the user bubble ~550ms after the stream ended.
    useLayoutEffect(() => {
        if (! building || ! live) return undefined
        const id = settledRef.current || settlingRef.current || shelfTurnId
        if (! id) return undefined

        let cancelled = false
        const again = () => {
            if (cancelled) return
            const lane = laneRef.current
            const crestId = settledRef.current || settlingRef.current || shelfTurnId
            const node = crestId ? bubbleRefs.current[crestId] : null
            if (! lane || ! node) return
            // Crest shelf is armed (Switch / send) — keep the user bubble docked.
            // Only stickTail when the reader was freely following with no crest.
            if (
                clingRef.current
                && ! settledRef.current
                && ! settlingRef.current
                && ! shelfTurnId
            ) {
                engine.stickTail(lane, { ms: 0 })
                return
            }
            clingRef.current = false
            lane.scrollTop = Math.max(0, engine.blockOrigin(node, lane))
        }

        const t1 = window.setTimeout(again, RAIL_MORPH_MS)
        const t2 = window.setTimeout(again, RAIL_MORPH_MS + 120)
        return () => {
            cancelled = true
            window.clearTimeout(t1)
            window.clearTimeout(t2)
        }
    }, [building, shelfTurnId, live, laneRef, bubbleRefs, engine])

    const shelfMinHeight = useMemo(() => {
        const port = laneRef.current
        const stack = stackRef.current
        if (port && stack) return engine.shelfExtent(port, stack)
        if (laneH > 0) return Math.max(0, Math.floor(laneH - 56) - 1)
        return 0
    }, [laneH, shelfTurnId, engine, laneRef, stackRef])

    // Keep the Follow chip in sync when the scroll range changes (stream growth).
    useEffect(() => {
        if (! live) return undefined
        const lane = laneRef.current
        const stack = stackRef.current
        if (! lane) return undefined

        const bump = () => {
            if (settlingRef.current || engine.animating) return
            syncFollowUi()
        }
        const ro = new ResizeObserver(bump)
        ro.observe(lane)
        if (stack) ro.observe(stack)
        return () => ro.disconnect()
    }, [live, busy, building, laneRef, stackRef, engine, syncFollowUi])

    const beginShelf = useCallback((id) => {
        engine.stop()
        settledRef.current = null
        settlingRef.current = null
        clingRef.current = false
        openTailRef.current = false
        setShowFollowButton(false)
        setShelfTurnId(id)
    }, [engine])

    const shelfReady = useCallback((id) => settledRef.current === id, [])

    const resumeFollow = useCallback(() => {
        const lane = laneRef.current
        if (! lane) return
        // Arm follow first so the next growth ticks keep chasing the stream.
        clingRef.current = true
        setShowFollowButton(false)
        // Instant jump — animated settle blocked growth and left the reader parked.
        engine.stickTail(lane, { ms: 0 })
        // One more frame after layout (mermaid/code) so we land on the true tail.
        requestAnimationFrame(() => {
            if (! clingRef.current) return
            const port = laneRef.current
            if (port) engine.stickTail(port, { ms: 0 })
        })
    }, [laneRef, engine])

    return {
        laneH,
        shelfTurnId,
        shelfMinHeight,
        beginShelf,
        shelfReady,
        showFollowButton,
        resumeFollow,
    }
}
