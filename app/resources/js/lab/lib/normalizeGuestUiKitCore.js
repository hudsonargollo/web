import { normalizeVfsPath } from './vfs.js'

const BUTTON_REL = 'src/components/ui/button.jsx'

/** @param {Record<string, string>} files */
export function projectUsesButtonAsChild(files = {}) {
    for (const [path, body] of Object.entries(files)) {
        if (! /\.(jsx|tsx)$/i.test(String(path || ''))) continue
        if (/<Button\b[^>]*\basChild\b/.test(String(body || ''))) return true
    }
    return false
}

/** @param {string} source */
export function buttonNeedsAsChildPatch(source = '') {
    const body = String(source || '')
    if (! body.includes('Button')) return false
    if (body.includes('asChild')) return false
    return body.includes('...props') || body.includes('export function Button')
}

/**
 * @param {Record<string, string>} files normalized VFS paths
 * @param {string} canonicalButton
 * @returns {{ files: Record<string, string>, changed: boolean }}
 */
export function normalizeGuestUiKit(files = {}, canonicalButton = '') {
    if (! files || typeof files !== 'object') {
        return { files: files || {}, changed: false }
    }

    const usesAsChild = projectUsesButtonAsChild(files)
    if (! usesAsChild || ! canonicalButton) {
        return { files, changed: false }
    }

    const key = Object.keys(files).find((path) => normalizeVfsPath(path) === BUTTON_REL)
    if (! key) {
        return { files: { ...files, [BUTTON_REL]: canonicalButton }, changed: true }
    }

    if (! buttonNeedsAsChildPatch(files[key])) {
        return { files, changed: false }
    }

    return {
        files: { ...files, [key]: canonicalButton },
        changed: true,
    }
}
