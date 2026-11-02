/**
 * Guest writes Vite cannot HMR — the preview iframe must remount.
 */

export const PREVIEW_RESYNC_EVENT = 'krikkit-preview-resync'

export function guestWriteRestartsDev(path) {
    return /(?:^|\/)(?:package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|vite\.config\.[cm]?[jt]s|postcss\.config\.[cm]?[jt]s|tailwind\.config\.[cm]?[jt]s|next\.config\.[cm]?[jt]s|index\.html)$/i.test(String(path || ''))
}

export function guestWriteNeedsReload(path) {
    const p = String(path || '').replace(/\\/g, '/')
    if (guestWriteRestartsDev(p)) return true
    if (/(?:^|\/)public\//i.test(p)) return true
    if (/(?:^|\/)\.env(?:\..+)?$/i.test(p)) return true
    if (/(?:^|\/)(?:ts|js)config(?:\.\w+)?\.json$/i.test(p)) return true
    return false
}

export function looksLikeVitePageReload(text) {
    return /\[vite\]\s+(?:page reload|full reload)\b/i.test(String(text || ''))
        || /\b(?:page reload|full reload)\s+\S+/i.test(String(text || ''))
}

export function anyPathNeedsPreviewReload(paths = []) {
    return paths.some((path) => guestWriteNeedsReload(path))
}
