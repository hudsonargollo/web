/**
 * Normalized Fuzzy Line Matcher for the Lab Patch Engine.
 *
 * Progressive locate: exact → normalized line-block → line-range hash → Levenshtein.
 */

/** Max relative Levenshtein distance (0–1) for a fuzzy line-window accept. */
const FUZZY_MAX_DISTANCE_RATIO = 0.18
/** Soft floor: absolute edits allowed on very short needles. */
const FUZZY_MIN_DISTANCE = 2
/** Context lines included in reject-feedback snippets. */
const REJECT_SNIPPET_PAD = 2
const REJECT_SNIPPET_MAX_CHARS = 2_400

/**
 * Locate `needle` inside `haystack` with progressive fallbacks.
 * @returns {{ start: number, end: number, method: string, score?: number }|null}
 */
export function locatePatchTarget(haystack, needle) {
    const source = String(haystack ?? '')
    const search = String(needle ?? '')
    if (! search) return null

    const exact = findExactMatch(source, search)
    if (exact) return exact

    const normalized = findNormalizedLineBlock(source, search)
    if (normalized) return normalized

    const hashed = findByLineRangeHash(source, search)
    if (hashed) return hashed

    const fuzzy = findByLevenshteinWindow(source, search)
    if (fuzzy) return fuzzy

    return null
}

/**
 * Build reject-feedback: exact current VFS lines the agent must use next.
 */
export function buildRejectFeedback(haystack, needle) {
    const source = String(haystack ?? '')
    const search = String(needle ?? '')
    const hayLines = splitLines(source)

    if (! source) {
        return {
            exactSnippet: '',
            startLine: null,
            endLine: null,
            totalLines: 0,
            bestMatchMethod: null,
            bestMatchScore: null,
        }
    }

    const best = findBestFuzzyWindow(source, search)
    let startLine = 1
    let endLine = Math.min(
        hayLines.length,
        Math.max(1, trimTrailingEmpty(splitLines(search)).length || 12),
    )

    if (best) {
        startLine = Math.max(1, best.startLine + 1 - REJECT_SNIPPET_PAD)
        endLine = Math.min(hayLines.length, best.endLine + REJECT_SNIPPET_PAD)
    } else if (hayLines.length) {
        const probe = trimTrailingEmpty(splitLines(search))
            .map(normalizeLineForMatch)
            .find((line) => line.length >= 8)
        if (probe) {
            const idx = hayLines.map(normalizeLineForMatch).findIndex((line) => (
                line.includes(probe) || probe.includes(line)
            ))
            if (idx >= 0) {
                const span = Math.max(1, trimTrailingEmpty(splitLines(search)).length)
                startLine = Math.max(1, idx + 1 - REJECT_SNIPPET_PAD)
                endLine = Math.min(hayLines.length, idx + span + REJECT_SNIPPET_PAD)
            }
        }
    }

    let exactSnippet = hayLines.slice(startLine - 1, endLine).join('\n')
    if (exactSnippet.length > REJECT_SNIPPET_MAX_CHARS) {
        exactSnippet = exactSnippet.slice(0, REJECT_SNIPPET_MAX_CHARS)
    }

    return {
        exactSnippet,
        startLine,
        endLine,
        totalLines: hayLines.length,
        bestMatchMethod: best?.method || null,
        bestMatchScore: best?.score ?? null,
    }
}

export function normalizeEol(text) {
    return String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function normalizeLineForMatch(line) {
    return String(line ?? '')
        .replace(/\t/g, '  ')
        .replace(/[ \t]+$/g, '')
        .replace(/^[ \t]+/, (leading) => ' '.repeat(leading.replace(/\t/g, '  ').length))
}

export function hashSearchPayload(search) {
    const normalized = trimTrailingEmpty(splitLines(String(search ?? '')))
        .map(normalizeLineForMatch)
        .join('\n')
    return hashLineRange(normalized ? normalized.split('\n') : [''])
}

function findExactMatch(source, search) {
    const idx = source.indexOf(search)
    if (idx === -1) return null
    return { start: idx, end: idx + search.length, method: 'exact', score: 1 }
}

/**
 * Match after normalizing EOLs, tabs→spaces, and trimming each line.
 * Replacement still targets the original character span in the file.
 */
function findNormalizedLineBlock(source, search) {
    const hayLines = splitLines(source)
    const needleLines = trimTrailingEmpty(splitLines(search))
    if (! needleLines.length) return null

    const normHay = hayLines.map(normalizeLineForMatch)
    const normNeedle = needleLines.map(normalizeLineForMatch)

    for (let i = 0; i <= normHay.length - normNeedle.length; i += 1) {
        let ok = true
        for (let j = 0; j < normNeedle.length; j += 1) {
            if (normHay[i + j] !== normNeedle[j]) {
                ok = false
                break
            }
        }
        if (! ok) continue
        const span = lineRangeToOffsets(source, hayLines, i, i + normNeedle.length)
        if (! span) continue
        return { ...span, method: 'normalized', score: 1 }
    }
    return null
}

/**
 * Relative line-range hashing: fingerprint the normalized needle line sequence
 * and slide a same-length window over the file.
 */
function findByLineRangeHash(source, search) {
    const hayLines = splitLines(source)
    const needleLines = trimTrailingEmpty(splitLines(search))
    if (! needleLines.length || needleLines.length > hayLines.length) return null

    const normHay = hayLines.map(normalizeLineForMatch)
    const normNeedle = needleLines.map(normalizeLineForMatch)
    const needleHash = hashLineRange(normNeedle)

    for (let i = 0; i <= normHay.length - normNeedle.length; i += 1) {
        const window = normHay.slice(i, i + normNeedle.length)
        if (hashLineRange(window) !== needleHash) continue
        let equal = true
        for (let j = 0; j < normNeedle.length; j += 1) {
            if (window[j] !== normNeedle[j]) {
                equal = false
                break
            }
        }
        if (! equal) continue
        const span = lineRangeToOffsets(source, hayLines, i, i + normNeedle.length)
        if (! span) continue
        return { ...span, method: 'line_hash', score: 1 }
    }
    return null
}

/**
 * Levenshtein fallback over same-length line windows (normalized).
 */
function findByLevenshteinWindow(source, search) {
    const hayLines = splitLines(source)
    const needleLines = trimTrailingEmpty(splitLines(search))
    if (! needleLines.length || needleLines.length > hayLines.length) return null

    const normHay = hayLines.map(normalizeLineForMatch)
    const normNeedle = needleLines.map(normalizeLineForMatch)
    const needleJoined = normNeedle.join('\n')
    const maxDist = Math.max(
        FUZZY_MIN_DISTANCE,
        Math.ceil(needleJoined.length * FUZZY_MAX_DISTANCE_RATIO),
    )

    let best = null
    for (let i = 0; i <= normHay.length - normNeedle.length; i += 1) {
        const windowJoined = normHay.slice(i, i + normNeedle.length).join('\n')
        if (Math.abs(windowJoined.length - needleJoined.length) > maxDist) continue
        const dist = levenshteinDistance(windowJoined, needleJoined, maxDist)
        if (dist == null || dist > maxDist) continue
        const score = 1 - (dist / Math.max(needleJoined.length, 1))
        if (! best || dist < best.dist || (dist === best.dist && score > best.score)) {
            best = { startLine: i, endLine: i + normNeedle.length, dist, score }
        }
    }

    if (! best) return null
    const span = lineRangeToOffsets(source, hayLines, best.startLine, best.endLine)
    if (! span) return null
    return { ...span, method: 'levenshtein', score: best.score }
}

function findBestFuzzyWindow(source, search) {
    if (! search) return null
    const hayLines = splitLines(source)
    const needleLines = trimTrailingEmpty(splitLines(search))
    if (! needleLines.length || needleLines.length > hayLines.length) return null

    const normHay = hayLines.map(normalizeLineForMatch)
    const normNeedle = needleLines.map(normalizeLineForMatch)
    const needleJoined = normNeedle.join('\n')

    let best = null
    for (let i = 0; i <= normHay.length - normNeedle.length; i += 1) {
        const windowJoined = normHay.slice(i, i + normNeedle.length).join('\n')
        const bound = Math.max(needleJoined.length, windowJoined.length)
        const dist = levenshteinDistance(windowJoined, needleJoined, bound)
        if (dist == null) continue
        const score = 1 - (dist / Math.max(bound, 1))
        if (! best || dist < best.dist) {
            best = {
                startLine: i,
                endLine: i + normNeedle.length,
                dist,
                score,
                method: dist === 0 ? 'normalized' : 'levenshtein',
            }
        }
    }
    return best
}

function splitLines(text) {
    return normalizeEol(text).split('\n')
}

function trimTrailingEmpty(lines) {
    const out = [...lines]
    while (out.length > 1 && out[out.length - 1] === '') out.pop()
    return out
}

function hashLineRange(lines) {
    const joined = (lines || []).join('\n')
    let hash = 0x811c9dc5
    for (let i = 0; i < joined.length; i += 1) {
        hash ^= joined.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(16)
}

/**
 * Map inclusive-exclusive line indexes to character offsets in the original source.
 */
function lineRangeToOffsets(source, hayLines, startLineIdx, endLineIdx) {
    if (startLineIdx < 0 || endLineIdx <= startLineIdx) return null

    const normalized = normalizeEol(source)
    let start = 0
    for (let i = 0; i < startLineIdx; i += 1) {
        start += hayLines[i].length + 1
    }
    let end = start
    for (let i = startLineIdx; i < endLineIdx; i += 1) {
        end += hayLines[i].length
        if (i < endLineIdx - 1) end += 1
    }

    if (source === normalized) {
        return { start, end }
    }

    if (source.replace(/\r\n/g, '\n').replace(/\r/g, '\n') === normalized) {
        return mapLfOffsetsToOriginal(source, start, end)
    }

    const block = hayLines.slice(startLineIdx, endLineIdx).join('\n')
    const idx = normalized.indexOf(block)
    if (idx === -1) return { start, end }
    return mapLfOffsetsToOriginal(source, idx, idx + block.length)
}

function mapLfOffsetsToOriginal(original, lfStart, lfEnd) {
    let lf = 0
    let start = null
    let end = null
    for (let i = 0; i < original.length; i += 1) {
        if (lf === lfStart && start == null) start = i
        if (lf === lfEnd && end == null) {
            end = i
            break
        }
        if (original[i] === '\r' && original[i + 1] === '\n') {
            lf += 1
            i += 1
            continue
        }
        lf += 1
    }
    if (start == null) start = original.length
    if (end == null) end = original.length
    return { start, end }
}

/**
 * Bounded Levenshtein — returns null when distance exceeds maxDist.
 */
function levenshteinDistance(a, b, maxDist = Infinity) {
    if (a === b) return 0
    const n = a.length
    const m = b.length
    if (Math.abs(n - m) > maxDist) return null
    if (! n) return m <= maxDist ? m : null
    if (! m) return n <= maxDist ? n : null

    let prev = new Array(m + 1)
    let curr = new Array(m + 1)
    for (let j = 0; j <= m; j += 1) prev[j] = j

    for (let i = 1; i <= n; i += 1) {
        curr[0] = i
        let rowMin = curr[0]
        const ca = a.charCodeAt(i - 1)
        for (let j = 1; j <= m; j += 1) {
            const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost,
            )
            if (curr[j] < rowMin) rowMin = curr[j]
        }
        if (rowMin > maxDist) return null
        const swap = prev
        prev = curr
        curr = swap
    }
    const dist = prev[m]
    return dist > maxDist ? null : dist
}
