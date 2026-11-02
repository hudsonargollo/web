import { useCallback, useRef, useState } from 'react'
import { RAIL_MAX_W, RAIL_MIN_W } from '../lib/labConstants'

export function useChatRail({ building }) {
    /** null = CSS default rail (keeps Switch morph); number = user-resized px */
    const [railW, setRailW] = useState(null)
    const [railResizing, setRailResizing] = useState(false)
    const chatRailRef = useRef(null)
    const railDragRef = useRef(null)

    const onRailResizeStart = useCallback((event) => {
        if (! building) return
        event.preventDefault()
        const measured = Math.round(chatRailRef.current?.getBoundingClientRect().width || 384)
        const startW = railW ?? measured
        railDragRef.current = { startX: event.clientX, startW }
        setRailW(startW)
        setRailResizing(true)

        const onMove = (ev) => {
            const drag = railDragRef.current
            if (! drag) return
            const next = Math.min(RAIL_MAX_W, Math.max(RAIL_MIN_W, drag.startW + (ev.clientX - drag.startX)))
            setRailW(next)
        }

        const onUp = () => {
            railDragRef.current = null
            setRailResizing(false)
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
    }, [building, railW])

    return {
        railW,
        setRailW,
        railResizing,
        chatRailRef,
        onRailResizeStart,
    }
}
