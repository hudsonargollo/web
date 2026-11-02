import {
    LANES,
    SCOPES,
    SESSION_MODES,
    WRITE_MODES,
} from './constants.js'

const BUILD_CUES = [
    /\b(build|create|make|add|update|change|fix|edit|rewrite|implement|generate|scaffold|page|component|button|layout|style|css|jsx|tsx|html)\b/i,
    /\b(remove|delete|rename|move|refactor)\b/i,
]

const CHAT_CUES = [
    /\b(why|how|what|explain|compare|suggest|recommend|idea|brainstorm|think)\b/i,
    /\b(just (chat|talk|discuss)|only (chat|talk)|don't (code|write|change)|do not (code|write|change))\b/i,
]

const CLARIFY_CUES = [
    /^(hmm+|ok|okay|yes|no|sure|idk|maybe)\.?$/i,
]

const MULTI_FILE_CUES = [
    /\b(pages?|routes?|multi[- ]?page|entire (app|site)|whole (app|site)|scaffold|all files)\b/i,
]

const SCAFFOLD_CUES = [
    /\b(from scratch|scaffold|bootstrap|new (app|site|project)|start over)\b/i,
]

/**
 * Cheap rule-based Intent Router (no model round-trip).
 * Produces an Intent Envelope for lane dispatch.
 *
 * @param {{
 *   text?: string,
 *   sessionMode?: string,
 *   explicitLane?: string|null,
 *   selectedPath?: string|null,
 *   hasAttachments?: boolean,
 *   workspaceOpen?: boolean,
 * }} input
 */
export function classifyIntent(input = {}) {
    const text = String(input.text || '').trim()
    const sessionMode = input.sessionMode === SESSION_MODES.BUILDING
        || input.workspaceOpen
        ? SESSION_MODES.BUILDING
        : SESSION_MODES.PLANNING

    const explicit = normalizeLane(input.explicitLane)
    const selectionBoost = Boolean(input.selectedPath) || Boolean(input.hasAttachments)

    let buildScore = sessionMode === SESSION_MODES.BUILDING ? 0.35 : 0.1
    let chatScore = sessionMode === SESSION_MODES.PLANNING ? 0.35 : 0.15
    let clarifyScore = 0

    if (! text && ! selectionBoost) {
        clarifyScore = 0.9
    }

    for (const re of BUILD_CUES) {
        if (re.test(text)) buildScore += 0.22
    }
    for (const re of CHAT_CUES) {
        if (re.test(text)) chatScore += 0.25
    }
    for (const re of CLARIFY_CUES) {
        if (re.test(text)) clarifyScore += 0.55
    }

    if (selectionBoost) buildScore += 0.2
    if (/\b(src\/|\.jsx|\.tsx|\.css|\.html)\b/i.test(text)) buildScore += 0.15

    const chatLock = /\b(just (chat|talk)|only (chat|talk)|don't (code|write|change))\b/i.test(text)
    if (chatLock) {
        chatScore += 0.8
        buildScore = Math.min(buildScore, 0.15)
    }

    let lane = LANES.CHAT
    let confidence = 0.55

    if (explicit === LANES.BUILD) {
        // UI Switch / autoStart must never demote to Clarifying — empty text
        // otherwise scores clarify=0.9 and aborts the executor before tools run.
        lane = LANES.BUILD
        confidence = 0.95
    } else if (explicit === LANES.CHAT) {
        lane = LANES.CHAT
        confidence = 0.95
        if (clarifyScore >= 0.7 && text.length < 12) {
            lane = LANES.CLARIFY
            confidence = 0.7
        }
    } else if (clarifyScore >= 0.7 && clarifyScore >= buildScore && clarifyScore >= chatScore) {
        lane = LANES.CLARIFY
        confidence = Math.min(0.92, clarifyScore)
    } else if (buildScore >= chatScore + 0.08) {
        lane = LANES.BUILD
        confidence = Math.min(0.94, 0.45 + buildScore)
    } else if (chatScore >= buildScore) {
        lane = LANES.CHAT
        confidence = Math.min(0.94, 0.45 + chatScore)
    } else {
        lane = LANES.CLARIFY
        confidence = 0.5
    }

    // Low-confidence ambiguous asks → clarify (unless explicit override).
    if (! explicit && confidence < 0.55 && text.length > 0 && text.length < 40) {
        lane = LANES.CLARIFY
        confidence = Math.max(confidence, 0.52)
    }

    const mutation = lane === LANES.BUILD
    let scope = SCOPES.NONE
    let writeModeHint = WRITE_MODES.PATCH

    if (mutation) {
        if (SCAFFOLD_CUES.some((re) => re.test(text)) || sessionMode === SESSION_MODES.PLANNING) {
            scope = SCOPES.SCAFFOLD
            writeModeHint = WRITE_MODES.FULL
        } else if (MULTI_FILE_CUES.some((re) => re.test(text))) {
            scope = SCOPES.MULTI_FILE
            writeModeHint = WRITE_MODES.FULL
        } else {
            scope = SCOPES.SINGLE_FILE
            writeModeHint = WRITE_MODES.PATCH
        }
    }

    return {
        lane,
        mutation,
        scope,
        confidence,
        sessionAffinity: sessionMode,
        writeModeHint,
        chatLock,
        signals: {
            buildScore,
            chatScore,
            clarifyScore,
            selectionBoost,
            explicit: explicit || null,
        },
    }
}

function normalizeLane(value) {
    if (value === LANES.CHAT || value === LANES.BUILD || value === LANES.CLARIFY) return value
    if (value === 'plan' || value === 'planning') return LANES.CHAT
    if (value === 'build' || value === 'building') return LANES.BUILD
    return null
}
