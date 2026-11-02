export function readLabEntitlement() {
    try {
        const el = document.getElementById('lab-config')
        if (el?.textContent) {
            const parsed = JSON.parse(el.textContent)
            if (parsed?.entitlement && typeof parsed.entitlement === 'object') {
                return parsed.entitlement
            }
        }
    } catch {
        /* ignore */
    }
    return null
}

export function isEntitlementDenied(error) {
    if (! error) return false
    if (error.status === 402) return true
    const payload = error.payload || error
    return payload?.error === 'entitlement_denied'
}

export function featureAllowed(snapshot, key) {
    return Boolean(snapshot?.features?.[key])
}
