/**
 * Cheap brief heuristics — keep in lockstep with App\\Ai\\Lab\\BriefSignals.
 */

export function looksLikeSoftware(text = '') {
    const t = String(text || '').trim().toLowerCase()
    return /\b(saas|dashboard|auth|cli|api\b|sdk|docs?|editor|ide\b|status page|component library|design system)\b/u.test(t)
}

export function needsPhotograph(text = '') {
    const t = String(text || '').trim().toLowerCase()
    if (! t || looksLikeSoftware(t)) return false
    return /jewelry|jeweller|atelier|restaurant|hotel|bakery|cafe|coffee|boutique|florist|fashion|spa\b|wine|gallery|museum|barber|salon|food\b|interior|architect|jewels?|ring\b|necklace|earring/u.test(t)
}

export function vfsHasPhotograph(files = {}) {
    return Object.values(files || {}).some((body) => (
        /<img\b[^>]*src\s*=\s*["'][^"']+/i.test(String(body ?? ''))
    ))
}
