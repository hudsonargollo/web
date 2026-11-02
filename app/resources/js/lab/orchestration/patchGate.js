import { normalizeVfsPath } from '../lib/vfs.js'
import { DIFF_LOOP_IDENTICAL_AFTER, ERROR_CLASSES } from './constants.js'

/**
 * Per-turn patch gate: last-valid snapshot + near-identical diff circuit breaker.
 *
 * Tracks consecutive write signatures per file. On the 3rd near-identical delta,
 * restores the last known valid body and locks string-diffs on that path.
 */

/**
 * @typedef {{
 *   signatures: string[],
 *   streak: number,
 *   lastSignature: string|null,
 *   lastValid: string|null,
 *   preStreakValid: string|null,
 *   locked: boolean,
 *   lockReason: string|null,
 * }} PathGateState
 */

export function createPatchGate() {
    /** @type {Map<string, PathGateState>} */
    const paths = new Map()

    function stateFor(path) {
        const key = normalizeVfsPath(path)
        if (! key) return null
        if (! paths.has(key)) {
            paths.set(key, {
                signatures: [],
                streak: 0,
                lastSignature: null,
                lastValid: null,
                preStreakValid: null,
                locked: false,
                lockReason: null,
            })
        }
        return { key, state: paths.get(key) }
    }

    function isLocked(path) {
        const row = stateFor(path)
        return Boolean(row?.state?.locked)
    }

    function getLastValid(path) {
        const row = stateFor(path)
        return row?.state?.lastValid ?? null
    }

    /**
     * Inspect a candidate write BEFORE mutation.
     *
     * @param {string} path
     * @param {string} before
     * @param {string} after
     * @param {{ writeMode?: string }} [meta]
     * @returns {{
     *   allow: boolean,
     *   restore?: string|null,
     *   trip?: boolean,
     *   streak?: number,
     *   similarity?: number,
     *   signature?: string,
     *   reason?: string,
     * }}
     */
    function preflight(path, before, after, meta = {}) {
        const row = stateFor(path)
        if (! row) {
            return { allow: false, reason: 'invalid_path' }
        }
        const { state } = row
        const signature = buildDiffSignature(before, after, meta)
        const similarity = state.lastSignature
            ? signatureSimilarity(state.lastSignature, signature)
            : 0

        if (state.locked) {
            // Allow a substantially different full rewrite to unlock; block near-identical / patches.
            const isPatch = meta.writeMode === 'patch'
            if (isPatch || similarity >= 0.92) {
                return {
                    allow: false,
                    restore: state.lastValid,
                    trip: true,
                    streak: state.streak,
                    similarity,
                    signature,
                    reason: 'diff_loop_locked',
                }
            }
            // Distinct full write — unlock and continue.
            state.locked = false
            state.lockReason = null
            state.streak = 0
            state.signatures = []
            state.lastSignature = null
        }

        // Would this be the Nth near-identical consecutive write?
        if (
            state.streak >= DIFF_LOOP_IDENTICAL_AFTER - 1
            && state.lastSignature
            && nearIdenticalSignatures(state.lastSignature, signature)
        ) {
            const restore = state.preStreakValid != null
                ? state.preStreakValid
                : (state.lastValid != null ? state.lastValid : before)
            state.locked = true
            state.lockReason = 'near_identical_streak'
            state.streak = DIFF_LOOP_IDENTICAL_AFTER
            return {
                allow: false,
                restore,
                trip: true,
                streak: DIFF_LOOP_IDENTICAL_AFTER,
                similarity: signatureSimilarity(state.lastSignature, signature),
                signature,
                reason: 'diff_loop_breaker',
            }
        }

        return {
            allow: true,
            signature,
            similarity,
            streak: state.streak,
        }
    }

    /**
     * Record a successful validated write.
     *
     * @param {string} path
     * @param {string} before
     * @param {string} after
     * @param {string} signature
     */
    function commitSuccess(path, before, after, signature) {
        const row = stateFor(path)
        if (! row) return
        const { state } = row

        if (state.lastSignature && nearIdenticalSignatures(state.lastSignature, signature)) {
            // Continuing a near-identical streak — keep preStreakValid from when the streak began.
            state.streak += 1
        } else {
            // New streak — lock restore target to the last known valid body before this write.
            state.preStreakValid = state.lastValid != null ? state.lastValid : before
            state.streak = 1
        }

        state.lastSignature = signature
        state.signatures.push(signature)
        if (state.signatures.length > 8) {
            state.signatures = state.signatures.slice(-8)
        }
        state.lastValid = after
        state.locked = false
        state.lockReason = null
    }

    /**
     * Force-restore overlay to last valid (or provided body) and lock.
     *
     * @param {object} workingVfs
     * @param {string} path
     * @param {string|null} [restoreBody]
     */
    function restoreAndLock(workingVfs, path, restoreBody = null) {
        const row = stateFor(path)
        if (! row || ! workingVfs) return null
        const { key, state } = row
        const body = restoreBody != null
            ? restoreBody
            : (state.lastValid != null ? state.lastValid : (state.preStreakValid ?? ''))
        workingVfs.write(key, body)
        state.locked = true
        state.lockReason = state.lockReason || 'diff_loop_breaker'
        state.lastValid = body
        return body
    }

    function peek(path) {
        const row = stateFor(path)
        if (! row) return null
        return { ...row.state, path: row.key }
    }

    return {
        preflight,
        commitSuccess,
        restoreAndLock,
        isLocked,
        getLastValid,
        peek,
        errorClass: ERROR_CLASSES.DIFF_LOOP,
    }
}

/**
 * Stable signature for a before→after delta (near-identical loop detection).
 *
 * @param {string} before
 * @param {string} after
 * @param {{ writeMode?: string }} [meta]
 * @returns {string}
 */
export function buildDiffSignature(before = '', after = '', meta = {}) {
    const mode = meta.writeMode || 'full'
    const normBefore = normalizeForSignature(before)
    const normAfter = normalizeForSignature(after)
    // Prefer delta shape so oscillation A↔B and repeated same-patch both trip.
    const delta = diffSketch(normBefore, normAfter)
    return `${mode}|${fnv1a(delta)}|${fnv1a(normAfter)}|${normAfter.length}`
}

export function nearIdenticalSignatures(a = '', b = '') {
    if (! a || ! b) return false
    if (a === b) return true
    return signatureSimilarity(a, b) >= 0.92
}

export function signatureSimilarity(a = '', b = '') {
    if (a === b) return 1
    if (! a || ! b) return 0
    // Cheap token Jaccard on signature parts + length ratio.
    const ta = new Set(String(a).split(/[^a-f0-9]+/i).filter(Boolean))
    const tb = new Set(String(b).split(/[^a-f0-9]+/i).filter(Boolean))
    if (! ta.size || ! tb.size) return 0
    let inter = 0
    for (const t of ta) {
        if (tb.has(t)) inter += 1
    }
    const union = ta.size + tb.size - inter
    const jaccard = union ? inter / union : 0
    // Also compare trailing length segments for near-duplicate full bodies.
    const lenA = Number(String(a).split('|').pop()) || 0
    const lenB = Number(String(b).split('|').pop()) || 0
    const lenRatio = lenA && lenB
        ? Math.min(lenA, lenB) / Math.max(lenA, lenB)
        : 0
    return Math.max(jaccard, jaccard * 0.7 + lenRatio * 0.3)
}

function normalizeForSignature(text = '') {
    return String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function diffSketch(before = '', after = '') {
    if (before === after) return 'noop'
    // Line-level add/remove fingerprint — enough for oscillation detection.
    const bLines = new Set(before.split('\n'))
    const aLines = after.split('\n')
    /** @type {string[]} */
    const added = []
    /** @type {string[]} */
    const removed = []
    const aSet = new Set(aLines)
    for (const line of aLines) {
        if (! bLines.has(line)) added.push(line)
    }
    for (const line of bLines) {
        if (! aSet.has(line)) removed.push(line)
    }
    return `+${added.slice(0, 40).join('\n')}\n-${removed.slice(0, 40).join('\n')}`
}

function fnv1a(text = '') {
    let hash = 0x811c9dc5
    const str = String(text || '')
    for (let i = 0; i < str.length; i += 1) {
        hash ^= str.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Build a precise reject observation summary for the agent.
 *
 * @param {{
 *   path: string,
 *   line?: number|null,
 *   column?: number|null,
 *   errorType?: string,
 *   message?: string,
 *   writeMode?: string,
 * }} detail
 * @returns {string}
 */
export function buildPrewriteRejectSummary(detail = {}) {
    const path = detail.path || 'unknown'
    const loc = detail.line != null
        ? `${path}:${detail.line}${detail.column != null ? `:${detail.column}` : ''}`
        : path
    const type = detail.errorType || 'ValidationError'
    const message = String(detail.message || 'invalid file state').slice(0, 240)
    return [
        `REJECTED ${detail.writeMode || 'write'} on ${loc} [${type}]: ${message}.`,
        'VFS unchanged. Fix ONLY this failing delta/block — do not rewrite unrelated sections.',
    ].join(' ')
}

/**
 * Circuit breaker observation summary.
 *
 * @param {string} path
 * @param {{ streak?: number, similarity?: number }} [meta]
 * @returns {string}
 */
export function buildDiffLoopSummary(path, meta = {}) {
    const streak = meta.streak || DIFF_LOOP_IDENTICAL_AFTER
    return [
        `CIRCUIT BREAKER: ${path} locked after ${streak} near-identical consecutive writes`,
        meta.similarity != null ? `(similarity ${Math.round(meta.similarity * 100)}%)` : '',
        '— file restored to last known valid state.',
        'Stop apply_patch / string-diffs on this block. Do not oscillate.',
        'If a change is still required, call write_file once with a substantially different correct full file body.',
    ].filter(Boolean).join(' ')
}
