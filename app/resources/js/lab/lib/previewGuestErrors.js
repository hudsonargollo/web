/** Preview iframe runtime/console faults forwarded to Lab error store. */
export const PREVIEW_GUEST_ERROR_EVENT = 'krikkit-lab-guest-console-error'

export const PREVIEW_GUEST_REPAIR_EVENT = 'krikkit-lab-request-repair'

/** Masked cross-origin/runtime boot noise — not actionable in Lab preview. */
export function isIgnorableGuestRuntimeError(message = '', stack = '') {
    const msg = String(message || '').trim()
    const hay = `${msg}\n${String(stack || '')}`
    if (/^script error\.?$/i.test(msg)) return true
    if (/^error invoking remote method/i.test(msg)) return true
    if (/^loading chunk \d+ failed/i.test(msg)) return true
    if (/^failed to fetch dynamically imported module/i.test(msg)) return true
    return /^script error/i.test(hay) && !/\b(typeerror|referenceerror|syntaxerror|invalid hook|cannot read|failed to resolve)\b/i.test(hay)
}

/** @param {{ message?: string, stack?: string, file?: string|null, line?: number|null, component?: string|null, category?: string|null }} detail */
export function dispatchPreviewGuestError(detail = {}) {
    if (typeof window === 'undefined') return
    if (detail.category !== 'BUILD_ERROR' && isIgnorableGuestRuntimeError(detail.message, detail.stack)) return
    window.dispatchEvent(new CustomEvent(PREVIEW_GUEST_ERROR_EVENT, { detail }))
}
