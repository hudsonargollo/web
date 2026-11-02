const MAX_RECENTS = 24

function storageKey(projectUuid) {
    return `krikkit.lab.recents.${projectUuid}`
}

/**
 * Recently opened workspace paths, newest first.
 * @param {string|null} projectUuid
 * @returns {string[]}
 */
export function readRecentPaths(projectUuid) {
    if (! projectUuid) return []
    try {
        const raw = window.localStorage.getItem(storageKey(projectUuid))
        const list = raw ? JSON.parse(raw) : []
        if (! Array.isArray(list)) return []
        return list
            .map((path) => String(path || '').trim())
            .filter(Boolean)
            .slice(0, MAX_RECENTS)
    } catch {
        return []
    }
}

/**
 * @param {string|null} projectUuid
 * @param {string} path
 * @returns {string[]}
 */
export function pushRecentPath(projectUuid, path) {
    const normalized = String(path || '').trim()
    if (! projectUuid || ! normalized) return readRecentPaths(projectUuid)

    const next = [
        normalized,
        ...readRecentPaths(projectUuid).filter((item) => item !== normalized),
    ].slice(0, MAX_RECENTS)

    try {
        window.localStorage.setItem(storageKey(projectUuid), JSON.stringify(next))
    } catch {
        /* ignore quota / private mode */
    }

    return next
}
