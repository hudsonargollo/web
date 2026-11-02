import { TURN_STATES } from './constants.js'

/** Legal transitions for the Lab turn state machine. */
const TRANSITIONS = Object.freeze({
    [TURN_STATES.IDLE]: [TURN_STATES.RECEIVED],
    [TURN_STATES.RECEIVED]: [TURN_STATES.ROUTING, TURN_STATES.ABORTING],
    [TURN_STATES.ROUTING]: [
        TURN_STATES.CHAT_RESPONDING,
        TURN_STATES.CLARIFYING,
        TURN_STATES.PLANNING,
        TURN_STATES.ABORTING,
    ],
    [TURN_STATES.CHAT_RESPONDING]: [TURN_STATES.PRESENTING, TURN_STATES.ABORTING],
    [TURN_STATES.CLARIFYING]: [TURN_STATES.PRESENTING, TURN_STATES.ABORTING],
    [TURN_STATES.PLANNING]: [
        TURN_STATES.AWAITING_APPROVAL,
        TURN_STATES.EXECUTING,
        TURN_STATES.PRESENTING,
        TURN_STATES.ABORTING,
    ],
    [TURN_STATES.AWAITING_APPROVAL]: [
        TURN_STATES.EXECUTING,
        TURN_STATES.PRESENTING,
        TURN_STATES.ABORTING,
    ],
    [TURN_STATES.EXECUTING]: [
        TURN_STATES.TOOL_PENDING,
        TURN_STATES.OBSERVING,
        TURN_STATES.VALIDATING,
        TURN_STATES.ROLLING_BACK,
        TURN_STATES.ABORTING,
        TURN_STATES.FAILED,
    ],
    [TURN_STATES.TOOL_PENDING]: [
        TURN_STATES.OBSERVING,
        TURN_STATES.ABORTING,
    ],
    [TURN_STATES.OBSERVING]: [
        TURN_STATES.EXECUTING,
        TURN_STATES.VALIDATING,
        TURN_STATES.ROLLING_BACK,
        TURN_STATES.ABORTING,
    ],
    [TURN_STATES.VALIDATING]: [
        TURN_STATES.EXECUTING,
        TURN_STATES.COMMITTING,
        TURN_STATES.ROLLING_BACK,
        TURN_STATES.FAILED,
        TURN_STATES.ABORTING,
    ],
    [TURN_STATES.COMMITTING]: [
        TURN_STATES.SYNCING_PREVIEW,
        TURN_STATES.ROLLING_BACK,
        TURN_STATES.ABORTING,
    ],
    [TURN_STATES.ROLLING_BACK]: [TURN_STATES.PRESENTING],
    [TURN_STATES.SYNCING_PREVIEW]: [TURN_STATES.PRESENTING, TURN_STATES.ABORTING],
    [TURN_STATES.ABORTING]: [TURN_STATES.PRESENTING],
    [TURN_STATES.FAILED]: [TURN_STATES.PRESENTING],
    [TURN_STATES.PRESENTING]: [TURN_STATES.IDLE],
})

/**
 * Mutable turn machine. Abort is allowed from any build substate.
 */
export function createTurnMachine({ onTransition } = {}) {
    let state = TURN_STATES.IDLE
    let aborted = false
    const history = []

    function current() {
        return state
    }

    function isAborted() {
        return aborted
    }

    function canTransition(next) {
        if (next === TURN_STATES.ABORTING && state !== TURN_STATES.IDLE && state !== TURN_STATES.PRESENTING) {
            return true
        }
        const allowed = TRANSITIONS[state] || []
        return allowed.includes(next)
    }

    function transition(next, meta = {}) {
        if (state === next) return state

        if (next === TURN_STATES.ABORTING) {
            aborted = true
        }

        if (! canTransition(next)) {
            throw new Error(`Illegal turn transition: ${state} → ${next}`)
        }

        const from = state
        state = next
        history.push({ from, to: next, at: Date.now(), ...meta })
        onTransition?.({ from, to: next, meta, aborted })
        return state
    }

    function requestAbort(reason = 'user_stop') {
        if (state === TURN_STATES.IDLE || state === TURN_STATES.PRESENTING) {
            return false
        }
        if (state === TURN_STATES.ABORTING) return true
        aborted = true
        transition(TURN_STATES.ABORTING, { reason })
        return true
    }

    function assertNotAborted() {
        if (aborted || state === TURN_STATES.ABORTING) {
            const err = new Error('Turn aborted')
            err.code = 'ABORTED'
            throw err
        }
    }

    return {
        current,
        isAborted,
        canTransition,
        transition,
        requestAbort,
        assertNotAborted,
        history: () => [...history],
    }
}
