import { stripThoughtBlock } from '../orchestration/thoughtBlock.js'
import { stripWorkspaceMeta } from '../orchestration/metaStreamBuffer.js'
import { stripTodos } from '../orchestration/todos.js'
import { stripSuggestions } from '../orchestration/suggestions.js'
import { AGENT_STAGES } from '../orchestration/stageContract.js'

/** Status-only lines the executor historically left as the entire visible reply. */
const STATUS_ONLY = /^(working|writing|updating|starting|building|done|ok|on it|applied|saved)([.!]|\s|$)/iu

/**
 * True when a mutation turn closed with empty / status-only chat.
 *
 * @param {string} visible
 */
export function needsTurnRecap(visible) {
    const text = String(visible || '').replace(/\s+/g, ' ').trim()
    if (text === '') return true
    if (text.length >= 140) return false
    if (STATUS_ONLY.test(text)) return true

    return text.length < 80
}

/**
 * Last-resort recap when the follow-up model call fails.
 *
 * @param {string} userText
 * @param {string[]} paths
 */
export function fallbackTurnRecap(userText, paths = []) {
    const n = Array.isArray(paths) ? paths.filter(Boolean).length : 0

    return n
        ? `I applied the changes you asked for (${n} files). Check Preview — if you want something different, just say so.`
        : 'Done. Check Preview when you’re ready.'
}

/**
 * @param {{ userText?: string, paths?: string[], todos?: Array<{ task?: string, label?: string, title?: string }> }} options
 */
export function buildTurnRecapPrompt({ userText = '', paths = [], todos = [] } = {}) {
    const pathList = (paths || []).map((path) => String(path || '').trim()).filter(Boolean).slice(0, 24).join(', ')
    const todoList = (todos || [])
        .map((item) => item?.task || item?.label || item?.title)
        .map((label) => String(label || '').trim())
        .filter(Boolean)
        .slice(0, 8)
        .join('; ')

    return [
        '[KRIKKIT_TURN_RECAP — not a new user request]',
        'Workspace writes already landed. Do not call tools. Do not start another build.',
        'Reply in the user’s language, 2–4 short conversational sentences.',
        'Say what you built or changed and what they can try in Preview.',
        'No questions, no code fences, no file dumps, no propose_workspace, no <todos>, no pleasantries like “Sure!”.',
        userText ? `Original request: ${String(userText).slice(0, 800)}` : '',
        pathList ? `Changed files: ${pathList}` : '',
        todoList ? `Plan items: ${todoList}` : '',
    ].filter(Boolean).join('\n')
}

/**
 * Strip thought / meta / plan markup from a recap model reply.
 *
 * @param {string} raw
 */
export function stripRecapVisible(raw) {
    const thought = stripThoughtBlock(raw)
    const meta = stripWorkspaceMeta(thought.visible)
    const todos = stripTodos(meta.visible)
    const suggestions = stripSuggestions(todos.visible)

    return String(suggestions.visible || '').trim()
}

export const RECAP_TIMEOUT_MS = 20_000

function recapAbortSignal(parent) {
    const Timeout = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(RECAP_TIMEOUT_MS)
        : null
    if (parent && Timeout && typeof AbortSignal.any === 'function') {
        return AbortSignal.any([parent, Timeout])
    }

    return Timeout || parent || null
}

/**
 * Chat-stage recap after a successful mutation. Does not persist a new chat row.
 *
 * @param {{
 *   sendLabChat: Function,
 *   modelId?: string,
 *   projectUuid?: string|null,
 *   messages?: Array<{ role: string, content: string }>,
 *   userText?: string,
 *   paths?: string[],
 *   todos?: array,
 *   signal?: AbortSignal|null,
 * }} options
 */
export async function requestTurnRecap(options = {}) {
    const {
        sendLabChat,
        modelId,
        projectUuid,
        messages = [],
        userText = '',
        paths = [],
        todos = [],
        signal = null,
    } = options

    const fallback = fallbackTurnRecap(userText, paths)
    const recapUser = buildTurnRecapPrompt({ userText, paths, todos })
    const result = await sendLabChat({
        model: modelId || undefined,
        project: projectUuid || undefined,
        stage: AGENT_STAGES.CHAT,
        persist_user: false,
        persist_assistant: false,
        messages: [
            ...(Array.isArray(messages) ? messages : []),
            { role: 'user', content: recapUser },
        ],
        context_pack: {
            version: 1,
            stage: AGENT_STAGES.CHAT,
            pack: {
                safetyFlags: { turnRecap: true },
            },
        },
    }, { signal: recapAbortSignal(signal) })

    return {
        text: stripRecapVisible(result?.content) || fallback,
        model: result?.model || null,
        usage: result?.usage || null,
        credits: result?.credits || null,
    }
}
