import { normalizeVfsPath } from '../lib/vfs.js'
import { hashSearchPayload } from './patchMatch.js'

/**
 * Working VFS scratch for one turn. Canonical is never mutated here.
 * Copy-on-write over a frozen canonical snapshot.
 *
 * Maintains an active file-buffer map for the Patch Engine — every write
 * (agent patch, auto-heal stub, AST topology fallback) refreshes it immediately
 * so subsequent patches never target a stale pre-heal snapshot.
 */
export function createWorkingVfs(canonicalContents = {}) {
    const base = freezeMap(canonicalContents)
    /** @type {Record<string, string>} */
    let overlay = Object.create(null)
    /** @type {Set<string>} */
    const touched = new Set()
    /** Active Patch Engine buffers — path → live body. */
    /** @type {Record<string, string>} */
    let fileBuffers = Object.create(null)
    /** Rejected apply_patch search hashes per path — block blind identical retries. */
    /** @type {Map<string, Set<string>>} */
    const rejectedSearches = new Map()
    let discarded = false

    // Seed buffers from the canonical snapshot.
    for (const [path, body] of Object.entries(base)) {
        fileBuffers[path] = body
    }

    function ensureLive() {
        if (discarded) {
            const err = new Error('Working VFS discarded')
            err.code = 'WORKING_DISCARDED'
            throw err
        }
    }

    function read(path) {
        ensureLive()
        const key = normalizeVfsPath(path)
        if (! key) return ''
        if (Object.prototype.hasOwnProperty.call(overlay, key)) {
            return overlay[key]
        }
        return Object.prototype.hasOwnProperty.call(base, key) ? base[key] : ''
    }

    function has(path) {
        ensureLive()
        const key = normalizeVfsPath(path)
        if (! key) return false
        if (Object.prototype.hasOwnProperty.call(overlay, key)) return true
        return Object.prototype.hasOwnProperty.call(base, key)
    }

    function write(path, content) {
        ensureLive()
        const key = normalizeVfsPath(path)
        if (! key) return null
        const body = content == null ? '' : String(content)
        overlay[key] = body
        fileBuffers[key] = body
        touched.add(key)
        return key
    }

    /** Drop this turn's overlay for a path so it is not in pendingWrites(). */
    function revert(path) {
        ensureLive()
        const key = normalizeVfsPath(path)
        if (! key) return false
        delete overlay[key]
        touched.delete(key)
        if (Object.prototype.hasOwnProperty.call(base, key)) {
            fileBuffers[key] = base[key]
        } else {
            delete fileBuffers[key]
        }
        return true
    }

    /**
     * Patch Engine live buffer — always the post-heal / post-write body.
     */
    function getFileBuffer(path) {
        ensureLive()
        const key = normalizeVfsPath(path)
        if (! key) return ''
        if (Object.prototype.hasOwnProperty.call(fileBuffers, key)) {
            return fileBuffers[key]
        }
        return read(key)
    }

    /**
     * Refresh buffer map from current Working VFS state.
     * Call after auto-heal / AST resolver mutations (also done automatically on write).
     *
     * @param {string[]|null} [paths]
     * @returns {Record<string, string>}
     */
    function syncFileBuffers(paths = null) {
        ensureLive()
        const keys = Array.isArray(paths) && paths.length
            ? paths.map(normalizeVfsPath).filter(Boolean)
            : [...new Set([...Object.keys(base), ...Object.keys(overlay)])]
        for (const key of keys) {
            fileBuffers[key] = read(key)
        }
        return { ...fileBuffers }
    }

    function snapshotBuffers() {
        ensureLive()
        return { ...fileBuffers }
    }

    function rememberRejectedSearch(path, search) {
        const key = normalizeVfsPath(path)
        if (! key || search == null || search === '') return
        const hash = hashSearchPayload(search)
        if (! rejectedSearches.has(key)) rejectedSearches.set(key, new Set())
        rejectedSearches.get(key).add(hash)
    }

    function wasSearchRejected(path, search) {
        const key = normalizeVfsPath(path)
        if (! key || search == null || search === '') return false
        const set = rejectedSearches.get(key)
        if (! set || ! set.size) return false
        return set.has(hashSearchPayload(search))
    }

    function snapshot() {
        ensureLive()
        return { ...base, ...overlay }
    }

    function diffLedger() {
        ensureLive()
        const rows = []
        for (const path of [...touched].sort()) {
            const before = Object.prototype.hasOwnProperty.call(base, path) ? base[path] : null
            const after = overlay[path]
            if (before === after) continue
            rows.push({
                path,
                before,
                after,
                created: before == null,
                deleted: after == null,
            })
        }
        return rows
    }

    /** Files changed this turn — for atomic promote. */
    function pendingWrites() {
        ensureLive()
        /** @type {Record<string, string>} */
        const out = Object.create(null)
        for (const path of touched) {
            if (! Object.prototype.hasOwnProperty.call(overlay, path)) continue
            const before = Object.prototype.hasOwnProperty.call(base, path) ? base[path] : null
            if (before === overlay[path]) continue
            out[path] = overlay[path]
        }
        return out
    }

    function touchedPaths() {
        return [...touched]
    }

    /** Shield 2 / 5 — discard scratch; Canonical untouched. */
    function discard() {
        overlay = Object.create(null)
        touched.clear()
        fileBuffers = Object.create(null)
        rejectedSearches.clear()
        discarded = true
    }

    function isDiscarded() {
        return discarded
    }

    return {
        read,
        has,
        write,
        revert,
        getFileBuffer,
        syncFileBuffers,
        snapshotBuffers,
        rememberRejectedSearch,
        wasSearchRejected,
        snapshot,
        diffLedger,
        pendingWrites,
        touchedPaths,
        discard,
        isDiscarded,
    }
}

function freezeMap(contents) {
    /** @type {Record<string, string>} */
    const out = Object.create(null)
    for (const [raw, value] of Object.entries(contents || {})) {
        const path = normalizeVfsPath(raw)
        if (! path) continue
        out[path] = value == null ? '' : String(value)
    }
    return out
}
