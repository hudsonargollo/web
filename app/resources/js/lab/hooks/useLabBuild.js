import { useCallback, useEffect, useRef } from 'react'

/**
 * Build gate, workspace open, auto-start after Switch.
 */
export function useLabBuild({
    building,
    setBuilding,
    busy,
    turns,
    setTurns,
    setAnchorId,
    setRailW,
    beginShelf,
    sendRef,
}) {
    const queueAutoBuildRef = useRef(false)
    /** Switch: reuse discovery turn for crest dock + live tools (persist still uses a stub row). */
    const autoBuildAttachTurnRef = useRef(null)

    const flushAutoBuild = useCallback(() => {
        if (! queueAutoBuildRef.current || busy) return
        queueAutoBuildRef.current = false
        const attachTurnId = autoBuildAttachTurnRef.current
        autoBuildAttachTurnRef.current = null
        void sendRef.current?.({
            autoStart: true,
            ...(attachTurnId ? { attachTurnId } : {}),
        })
    }, [busy, sendRef])

    /** Open workspace rail. Silent first-build turn only when Switch provided a turnId. */
    const beginWorkspaceBuild = useCallback(({ turnId = null } = {}) => {
        setRailW(null)
        setTurns((list) => list.map((t) => {
            const next = { ...t, callouts: null }
            if (turnId && t.id === turnId) {
                return { ...next, buildGate: 'accepted' }
            }
            return next
        }))
        if (turnId) {
            autoBuildAttachTurnRef.current = turnId
            queueAutoBuildRef.current = true
            // Switch: dock the Lab user bubble BEFORE the rail morph, otherwise
            // cling/stickTail from the gate jumps the thread and hides the message.
            beginShelf(turnId)
            setAnchorId(turnId)
        }
        setBuilding(true)
        // If building was already true, the effect below won't re-fire — flush now.
        queueMicrotask(() => flushAutoBuild())
    }, [beginShelf, flushAutoBuild, setAnchorId, setBuilding, setRailW, setTurns])

    // ⌘/Ctrl+Enter confirms a pending build gate → open workspace and auto-start build.
    useEffect(() => {
        if (building || busy) return undefined

        const onKey = (event) => {
            if (! (event.metaKey || event.ctrlKey) || event.key !== 'Enter') return
            const pending = [...turns].reverse().find((t) => t.buildGate === 'pending')
            if (! pending) return
            event.preventDefault()
            beginWorkspaceBuild({ turnId: pending.id })
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [building, busy, turns, beginWorkspaceBuild])

    const skipBuildGate = useCallback((turnId) => {
        // Skip = reject this proposal only; AI follow-up streams in (no static seed).
        setTurns((list) => list.map((t) => (
            t.id === turnId
                ? {
                    ...t,
                    buildGate: 'skipped',
                    skipDivider: true,
                    callouts: null,
                }
                : { ...t, callouts: null }
        )))
        setAnchorId(turnId)
        queueMicrotask(() => {
            sendRef.current?.({
                systemEvent: true,
                followUpTurnId: turnId,
            })
        })
    }, [sendRef, setAnchorId, setTurns])

    const acceptBuildGate = useCallback((turnId) => {
        beginWorkspaceBuild({ turnId })
    }, [beginWorkspaceBuild])

    const openWorkspaceManual = useCallback(() => {
        setRailW(null)
        setBuilding(true)
    }, [setBuilding, setRailW])

    // After Switch: kick off the first build turn. Opening /workspace does not queue one.
    useEffect(() => {
        if (! building) return
        flushAutoBuild()
    }, [building, busy, flushAutoBuild])

    return {
        beginWorkspaceBuild,
        skipBuildGate,
        acceptBuildGate,
        openWorkspaceManual,
        queueAutoBuildRef,
        autoBuildAttachTurnRef,
    }
}
