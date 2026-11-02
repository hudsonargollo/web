import { normalizeVfsPath, upsertFileInTree } from './vfs'

/**
 * Normalize a path→content map for batch VFS writes.
 * @param {Record<string, string>|Map<string, string>|Array<[string, string]>} filesMap
 * @returns {Record<string, string>}
 */
export function normalizeFilesMap(filesMap) {
    const out = {}
    if (! filesMap) return out

    const entries = filesMap instanceof Map
        ? filesMap.entries()
        : Array.isArray(filesMap)
            ? filesMap
            : Object.entries(filesMap)

    for (const entry of entries) {
        const path = normalizeVfsPath(entry?.[0] ?? entry?.path)
        if (! path) continue
        const content = entry?.[1] ?? entry?.content
        out[path] = content == null ? '' : String(content)
    }

    return out
}

/**
 * Merge a files map into an existing VFS contents object (immutable).
 * @param {Record<string, string>} prev
 * @param {Record<string, string>} filesMap
 */
export function mergeVfsContents(prev = {}, filesMap = {}) {
    const batch = normalizeFilesMap(filesMap)
    if (! Object.keys(batch).length) return prev
    return { ...prev, ...batch }
}

/**
 * Apply batch paths onto a file tree (upsert each file leaf).
 * @param {unknown[]} tree
 * @param {Record<string, string>} filesMap
 */
export function upsertBatchInTree(tree, filesMap) {
    let next = tree
    const batch = normalizeFilesMap(filesMap)
    for (const path of Object.keys(batch)) {
        next = upsertFileInTree(next, path)
    }
    return next
}
