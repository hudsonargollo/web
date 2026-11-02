/**
 * Detect placeholder / dead guest documents inside the preview iframe.
 */

function guestDocument(iframe) {
    try {
        return iframe?.contentDocument || null
    } catch {
        return null
    }
}

/** Vite dev shell is loaded (dev server answered index.html). */
export function previewLooksViteGuest(iframe) {
    const doc = guestDocument(iframe)
    if (! doc) return false
    if (doc.querySelector('vite-error-overlay')) return true
    const scripts = doc.querySelectorAll('script[src]')
    for (const node of scripts) {
        if (String(node.getAttribute('src') || node.src || '').includes('@vite/client')) {
            return true
        }
    }
    return false
}

/** Guest app threw during render — still "live" for preview chrome. */
export function previewLooksGuestRuntimeError(iframe) {
    const doc = guestDocument(iframe)
    if (! doc?.body) return false
    if (doc.querySelector('vite-error-overlay')) return true
    const text = String(doc.body.innerText || '')
    return /Uncaught TypeError|Uncaught ReferenceError|An error occurred in the|Consider adding an error boundary/i.test(text)
}

export function previewLooksRefused(iframe) {
    try {
        const doc = guestDocument(iframe)
        if (! doc) return false
        const text = `${doc.title || ''} ${doc.body?.innerText || ''}`
        return /ERR_CONNECTION_REFUSED|connection refused|Failed to fetch|ERR_EMPTY_RESPONSE/i.test(text)
    } catch {
        return false
    }
}

/** Empty Vite/React shell — index.html loaded, app not mounted. */
export function previewLooksHollow(iframe) {
    try {
        const doc = guestDocument(iframe)
        if (! doc?.body) return false
        if (previewLooksGuestRuntimeError(iframe) || previewLooksViteGuest(iframe)) {
            return false
        }
        const root = doc.getElementById('root') || doc.getElementById('app')
        if (root && root.childElementCount === 0) return true
        if (doc.documentElement?.getAttribute('data-krikkit-preview-boot') === '1') return false
        const text = String(doc.body.innerText || '').replace(/\s+/g, ' ').trim()
        return doc.body.childElementCount <= 1 && text.length < 8
    } catch {
        return false
    }
}

/** Service worker boot page — not the real Vite app. */
export function previewLooksBooting(iframe) {
    try {
        const doc = guestDocument(iframe)
        if (! doc) return false
        if (doc.documentElement?.getAttribute('data-krikkit-preview-boot') === '1') return true
        if (doc.body?.getAttribute('data-krikkit-preview-boot') === '1') return true
        const title = String(doc.title || '')
        const text = String(doc.body?.innerText || '')
        return /Starting preview/i.test(title) || /dev server is booting/i.test(text)
    } catch {
        return false
    }
}

export function previewLooksLive(iframe) {
    if (previewLooksBooting(iframe) || previewLooksRefused(iframe)) return false
    if (previewLooksGuestRuntimeError(iframe) || previewLooksViteGuest(iframe)) return true
    if (previewLooksHollow(iframe)) return false
    try {
        const doc = guestDocument(iframe)
        if (! doc?.body) return false
        const hasNodes = doc.body.childElementCount > 0
        const hasText = Boolean(String(doc.body.innerText || '').trim())
        return hasNodes || hasText
    } catch {
        return false
    }
}
