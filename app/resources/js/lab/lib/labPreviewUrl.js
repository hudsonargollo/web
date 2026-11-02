/**
 * Private Lab preview URL: /lab/{uuid}/preview?path=/…
 */

export function normalizeGuestPath(path) {
    const raw = String(path || '').trim()
    if (! raw || raw === '/') return '/'
    if (raw.includes('://') || raw.startsWith('//')) return '/'
    let next = raw.startsWith('/') ? raw : `/${raw}`
    return next
}

export function labPreviewPath(uuid, guestPath = '/') {
    const id = String(uuid || '').trim()
    if (! id) return null
    const path = normalizeGuestPath(guestPath)
    const query = path && path !== '/' ? `?path=${encodeURIComponent(path)}` : ''
    return `/lab/${encodeURIComponent(id)}/preview${query}`
}

export function labPreviewHref(uuid, guestPath = '/') {
    const path = labPreviewPath(uuid, guestPath)
    if (! path) return null
    if (typeof window === 'undefined') return path
    return `${window.location.origin}${path}`
}

export function guestHref(baseUrl, path) {
    const raw = normalizeGuestPath(path)
    try {
        const parsed = new URL(raw, 'http://guest.local')
        const base = new URL(baseUrl, typeof window === 'undefined' ? 'http://lab.local' : window.location.href)
        const prefix = base.pathname.replace(/\/$/, '')
        base.pathname = `${prefix}${parsed.pathname}`
        base.search = parsed.search
        base.hash = parsed.hash
        return base.href
    } catch {
        return `${String(baseUrl).replace(/\/$/, '')}${raw}`
    }
}
