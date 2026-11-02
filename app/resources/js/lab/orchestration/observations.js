/**
 * Tool observation envelope (semantic contract — not a provider schema).
 */

export function makeObservation({
    status = 'ok',
    toolKind = 'unknown',
    summary = '',
    artifacts = {},
    hint = null,
    errorClass = null,
} = {}) {
    return {
        status,
        toolKind,
        summary: String(summary || '').slice(0, 600),
        artifacts: artifacts || {},
        hint: hint || null,
        errorClass: errorClass || null,
        at: Date.now(),
    }
}

export function observationOk(toolKind, summary, artifacts = {}, hint = null) {
    return makeObservation({ status: 'ok', toolKind, summary, artifacts, hint })
}

export function observationError(toolKind, summary, {
    errorClass = 'Recoverable',
    artifacts = {},
    hint = null,
} = {}) {
    return makeObservation({
        status: 'error',
        toolKind,
        summary,
        artifacts,
        hint,
        errorClass,
    })
}

export function observationFallback(toolKind, summary, artifacts = {}) {
    return makeObservation({
        status: 'fallback_applied',
        toolKind,
        summary,
        artifacts,
        hint: 'patch_miss_full_rewrite',
        errorClass: 'PatchMiss',
    })
}
