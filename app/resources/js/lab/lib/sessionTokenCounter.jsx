/**
 * Live session token totals for Lab header + Console (`tokens` command).
 * Tracks input / output / cached (prompt-cache hits) across turns.
 */

import { useEffect, useState } from 'react'

export const SESSION_TOKEN_CHANGE = 'krikkit:session-token-change'

/** @typedef {{ input: number, output: number, cached: number, cacheCreation: number }} TokenTotals */

/** @type {Map<string, TokenTotals>} */
const totalsByProject = new Map()

/** @type {Map<string, TokenTotals>} */
const lastTurnByProject = new Map()

/**
 * Normalize provider / gateway usage blobs (OpenAI / Anthropic / Gemini / UsageNormalizer).
 * @param {unknown} raw
 * @returns {TokenTotals}
 */
export function normalizeUsage(raw) {
    if (! raw || typeof raw !== 'object') {
        return { input: 0, output: 0, cached: 0, cacheCreation: 0 }
    }
    const u = /** @type {Record<string, unknown>} */ (raw)
    const details = (u.prompt_tokens_details && typeof u.prompt_tokens_details === 'object')
        ? /** @type {Record<string, unknown>} */ (u.prompt_tokens_details)
        : {}
    const inputDetails = (u.input_tokens_details && typeof u.input_tokens_details === 'object')
        ? /** @type {Record<string, unknown>} */ (u.input_tokens_details)
        : {}

    const input = Number(
        u.input_tokens
        ?? u.prompt_tokens
        ?? u.promptTokenCount
        ?? u.inputTokenCount
        ?? 0,
    ) || 0

    const output = Number(
        u.output_tokens
        ?? u.completion_tokens
        ?? u.candidatesTokenCount
        ?? u.outputTokenCount
        ?? 0,
    ) || 0

    const cached = Number(
        u.cached_tokens
        ?? u.cache_read_input_tokens
        ?? u.cachedContentTokenCount
        ?? details.cached_tokens
        ?? inputDetails.cached_tokens
        ?? inputDetails.cache_read_input_tokens
        ?? 0,
    ) || 0

    const cacheCreation = Number(
        u.cache_creation_tokens
        ?? u.cache_creation_input_tokens
        ?? 0,
    ) || 0

    return {
        input: Math.max(0, Math.floor(input)),
        output: Math.max(0, Math.floor(output)),
        cached: Math.max(0, Math.floor(cached)),
        cacheCreation: Math.max(0, Math.floor(cacheCreation)),
    }
}

function projectKey(projectUuid) {
    return String(projectUuid || '').trim() || '_anon'
}

function emptyTotals() {
    return { input: 0, output: 0, cached: 0, cacheCreation: 0 }
}

/**
 * @param {string|null|undefined} projectUuid
 * @returns {TokenTotals}
 */
export function getSessionTokenTotal(projectUuid) {
    return { ...(totalsByProject.get(projectKey(projectUuid)) || emptyTotals()) }
}

/**
 * @param {string|null|undefined} projectUuid
 * @returns {TokenTotals}
 */
export function getLastTurnTokenUsage(projectUuid) {
    return { ...(lastTurnByProject.get(projectKey(projectUuid)) || emptyTotals()) }
}

function emitChange(projectUuid, totals, lastTurn = null) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(SESSION_TOKEN_CHANGE, {
        detail: {
            projectUuid: projectUuid || null,
            input: totals.input,
            output: totals.output,
            cached: totals.cached,
            cacheCreation: totals.cacheCreation,
            lastTurn: lastTurn || null,
            at: Date.now(),
        },
    }))
}

/**
 * Accumulate usage and notify listeners immediately (live header + Console).
 * @param {string|null|undefined} projectUuid
 * @param {unknown} usage
 * @returns {{ input: number, output: number, cached: number, cacheCreation: number, delta: TokenTotals }}
 */
export function recordSessionUsage(projectUuid, usage) {
    const key = projectKey(projectUuid)
    const delta = normalizeUsage(usage)
    if (! delta.input && ! delta.output && ! delta.cached && ! delta.cacheCreation) {
        return { ...getSessionTokenTotal(projectUuid), delta }
    }
    lastTurnByProject.set(key, delta)
    const prev = totalsByProject.get(key) || emptyTotals()
    const next = {
        input: prev.input + delta.input,
        output: prev.output + delta.output,
        cached: prev.cached + delta.cached,
        cacheCreation: prev.cacheCreation + delta.cacheCreation,
    }
    totalsByProject.set(key, next)
    emitChange(projectUuid, next, delta)
    return { ...next, delta }
}

/**
 * @param {string|null|undefined} [projectUuid]
 */
export function resetSessionTokenTotal(projectUuid = null) {
    const key = String(projectUuid || '').trim()
    if (! key) {
        totalsByProject.clear()
        lastTurnByProject.clear()
        emitChange(null, emptyTotals())
        return
    }
    totalsByProject.delete(key)
    lastTurnByProject.delete(key)
    emitChange(key, emptyTotals())
}

/**
 * Live header badge — updates as soon as each chat response reports usage.
 */
export function SessionTokenBadge({ projectUuid = null }) {
    const [totals, setTotals] = useState(() => getSessionTokenTotal(projectUuid))

    useEffect(() => {
        setTotals(getSessionTokenTotal(projectUuid))
        const onChange = (event) => {
            const detail = event?.detail || {}
            const eventKey = projectKey(detail.projectUuid)
            const mine = projectKey(projectUuid)
            if (eventKey !== mine && eventKey !== '_anon' && mine !== '_anon') return
            setTotals({
                input: Number(detail.input) || 0,
                output: Number(detail.output) || 0,
                cached: Number(detail.cached) || 0,
                cacheCreation: Number(detail.cacheCreation) || 0,
            })
        }
        window.addEventListener(SESSION_TOKEN_CHANGE, onChange)
        return () => window.removeEventListener(SESSION_TOKEN_CHANGE, onChange)
    }, [projectUuid])

    const inTokens = Number(totals.input) || 0
    const outTokens = Number(totals.output) || 0
    const cachedTokens = Number(totals.cached) || 0

    return (
        <div
            className="flex shrink-0 items-center gap-2 font-mono text-[11px] tabular-nums text-krikkit-muted"
            title="Session tokens — input / output / cached (prompt-cache hits). Console: tokens"
            data-token-metrics="session"
        >
            <span>
                in
                {' '}
                <span className="text-krikkit-fg">{inTokens.toLocaleString()}</span>
            </span>
            <span className="text-krikkit-subtle" aria-hidden>·</span>
            <span>
                out
                {' '}
                <span className="text-krikkit-fg">{outTokens.toLocaleString()}</span>
            </span>
            {cachedTokens > 0 && (
                <>
                    <span className="text-krikkit-subtle" aria-hidden>·</span>
                    <span>
                        cache
                        {' '}
                        <span className="text-accent-content">{cachedTokens.toLocaleString()}</span>
                    </span>
                </>
            )}
        </div>
    )
}
