/**
 * Lab wait / thought elapsed clocks. Wait and thought use separate origins.
 */

export function parseLabTimestamp(value) {
    if (value == null || value === '') return Date.now()
    if (typeof value === 'number' && Number.isFinite(value)) return value
    const parsed = Date.parse(String(value))
    return Number.isFinite(parsed) ? parsed : Date.now()
}

export function formatLabElapsed(ms) {
    const total = Math.max(0, ms) / 1000
    if (total < 60) return `${total.toFixed(1)}s`
    return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`
}

export function elapsedSecSince(startedAt) {
    return Math.max(1, Math.round((Date.now() - parseLabTimestamp(startedAt)) / 1000))
}

const MODEL_WAIT_LABELS = new Set([
    'Waiting for model…',
    'Thinking…',
    'Starting build…',
    'Planning next move…',
    'Repairing…',
])

/** True when a status is still "waiting on the LLM", not a tool/write phase. */
export function isModelWaitLabel(label) {
    return MODEL_WAIT_LABELS.has(String(label || '').trim())
}
