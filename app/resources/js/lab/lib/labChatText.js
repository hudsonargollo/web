import {
    scrubSuggestionArtifacts,
    scrubTodoArtifacts,
    streamRevealSafe,
} from '../orchestration'
import { createBackgroundFrameLoop } from './backgroundFrame'

/** Text-only content for the gateway (shared lab prompt lives on the server). */
export function userContentForApi(text, files = []) {
    const body = text.trim()
    if (! files.length) return body

    const labels = files.map((f) => f.label || f.name).filter(Boolean)
    const note = labels.length
        ? `\n\n[Attachments: ${labels.join(', ')}]`
        : `\n\n[${files.length} attachment(s)]`

    return `${body}${note}`.trim()
}

export function packFiles(items) {
    return items.map((item) => ({
        id: item.id,
        url: item.url,
        name: item.name,
        type: item.type,
        size: item.size,
        kind: item.kind,
        label: item.label,
        toneClass: item.toneClass,
        ext: item.ext,
    }))
}

/** Explicit user phrases that re-arm the BuildGate / start build after Skip. */
export const USER_RESUME_BUILD_GATE = /\b(build\s+(it|now)|start\s+building|let'?s\s+(build|go|start)|ok(ay)?[,.]?\s*start|open\s+workspace)\b/iu

/**
 * Discovery reply is ready for the Switch card even if the model forgot
 * the propose_workspace meta. A trailing question still means “ask first”.
 */
export function discoveryReadyForBuild(bot = '') {
    const text = String(bot || '').trim()
    if (! text) return false
    if (/<suggestions>/i.test(text)) return false
    const tail = text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(-3)
        .join(' ')
    if (/\?\s*$/.test(tail)) return false
    return true
}

/** Wire-only Skip signal for Claude/OpenAI — never shown in chat UI / never persisted. */
export const BUILD_PROPOSAL_REJECTED_EVENT = '[EVENT: BUILD_PROPOSAL_REJECTED]'

/** Discovery chat must not become a code dump — strip fenced blocks and XML pseudo-tools from visible replies. */
export function redactDiscoveryCodeDumps(text = '') {
    let removed = false
    let out = String(text || '')
    out = out.replace(/```[\w+-]*\n?[\s\S]*?```/g, () => {
        removed = true
        return ''
    })
    out = out.replace(/<(?:write_file|read_file|list_dir|grep|file_search|lookup_visuals|survey_datastore|revise_datastore|github_[a-z_]+)>\s*(?:<path>[^<]+<\/path>\s*)?(?:<content>[\s\S]*?<\/content>\s*)?<\/(?:write_file|read_file|list_dir|grep|file_search|lookup_visuals|survey_datastore|revise_datastore|github_[a-z_]+)>/giu, () => {
        removed = true
        return ''
    })
    out = out.replace(/<lookup_visuals>\s*[\s\S]*?\s*<\/lookup_visuals>/giu, () => {
        removed = true
        return ''
    })
    const clean = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    if (! removed) return clean
    if (clean) return clean

    return 'Code belongs in the workspace, not chat. Let’s keep refining direction here.'
}

/** Past-tense “I already shipped this” — discovery has no VFS writes yet. */
const FAKE_BUILD_DONE = new RegExp([
    '\\bbuilt a complete\\b',
    '\\bi(?:[\'’]ve| have) built\\b',
    '\\bi finished\\b',
    '\\btry it in preview\\b',
    '\\bcheck preview\\b',
    '\\byou can (?:now )?(?:step through|try it)\\b',
    '\\bworking dashboard\\b',
    '\\bthe (?:flow|site|app|page) is (?:ready|live|done)\\b',
    '\\b(?:oluşturdum|inşa ettim|tamamladım)\\b',
    'preview[\'’]?da (?:dene|aç)',
].join('|'), 'i')

const DISCOVERY_PLACEHOLDER = 'Ready to open the workspace and start this build.'

/**
 * Workspace is still closed — never show a recap that pretends files landed.
 * Keeps future-tense plan sentences; drops “Built a complete… / Try Preview”.
 */
export function sanitizeDiscoveryReply(text = '') {
    const raw = String(text || '').trim()
    if (! raw) return raw

    const paragraphs = raw.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)
    const kept = []
    for (const block of paragraphs) {
        const sentences = block.split(/(?<=[.!?])\s+/).map((row) => row.trim()).filter(Boolean)
        const clean = []
        let stop = false
        for (const row of sentences) {
            if (FAKE_BUILD_DONE.test(row)) {
                stop = true
                break
            }
            clean.push(row)
        }
        if (clean.length) kept.push(clean.join(' '))
        if (stop) break
    }

    const next = kept.join('\n\n').trim()
    return next || DISCOVERY_PLACEHOLDER
}

/** Discovery chat: no code dumps, no fake “I already built this” recap. */
export function presentDiscoveryReply(text = '') {
    return sanitizeDiscoveryReply(redactDiscoveryCodeDumps(text))
}

function baseFileName(path = '') {
    const normalized = String(path || '').replace(/\\/g, '/').trim()
    if (! normalized) return ''
    return normalized.split('/').filter(Boolean).pop() || normalized
}

/**
 * Build-mode reply: scrub pseudo-tools; when writes failed, drop “all done” recaps.
 *
 * @param {string} text
 * @param {{ failedWrites?: Array<{ path?: string }> }} [options]
 */
export function sanitizeBuildReply(text = '', { failedWrites = [] } = {}) {
    let out = scrubPseudoToolTags(String(text || ''))
    const failures = (failedWrites || []).filter((row) => row?.path)
    if (! failures.length) return out

    if (FAKE_BUILD_DONE.test(out)) {
        const names = failures.map((row) => baseFileName(row.path)).filter(Boolean).join(', ')
        return names
            ? `Most of the page landed, but ${names} still needs a fix — check the write card above and ask me to retry that file.`
            : 'Most of the page landed, but one file still needs a fix — check the write card above.'
    }

    return out
}

/** Strip XML-style pseudo-tool tags from visible chat (build + discovery). */
export function scrubPseudoToolTags(text = '') {
    let out = String(text || '')
    out = out.replace(/<lookup_visuals>\s*[\s\S]*?\s*<\/lookup_visuals>/giu, '')
    out = out.replace(/<(?:write_file|read_file|list_dir|grep|file_search|survey_datastore|revise_datastore|github_[a-z_]+)>\s*[\s\S]*?<\/(?:write_file|read_file|list_dir|grep|file_search|survey_datastore|revise_datastore|github_[a-z_]+)>/giu, '')

    return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** lookup_visuals scene strings belong in the tool, not the transcript. */
export function scrubLookupVisualQueries(text = '', queries = []) {
    let out = scrubPseudoToolTags(text)
    const needles = [...new Set(
        (queries || []).map((query) => String(query || '').trim()).filter((query) => query.length >= 8),
    )]
    if (! needles.length) return out

    for (const needle of needles) {
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        out = out.replace(new RegExp(`^[\\s“"']*${escaped}[\\s”"']*(?:·\\s*\\d+)?\\s*$`, 'gim'), '')
        out = out.replace(new RegExp(`[“"']${escaped}[”"']`, 'g'), '')
    }

    return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function scrubChatArtifacts(text = '') {
    const suggestions = scrubSuggestionArtifacts(text)
    const todos = scrubTodoArtifacts(suggestions.text)
    return {
        text: todos.text,
        suggestions: suggestions.suggestions,
        todos: todos.todos,
    }
}

/** Reveal `text` over time so the reply doesn’t pop in as one block. */
export function streamReveal(text, onFrame, options = {}) {
    // Meta-safe — never paints <<<KRIKKIT_META…, <suggestions>, or <todos> into chat.
    return streamRevealSafe(text, (partial) => {
        onFrame(scrubChatArtifacts(partial).text)
    }, options).then((result) => {
        const scrubbed = scrubChatArtifacts(result?.visible ?? '')
        return {
            visible: scrubbed.text,
            propose_workspace: Boolean(result?.propose_workspace),
            suggestions: scrubbed.suggestions,
        }
    })
}

export function waitUntil(predicate, { timeoutMs = 2000 } = {}) {
    return new Promise((resolve) => {
        const started = performance.now()
        const loop = createBackgroundFrameLoop()
        const tick = () => {
            if (predicate() || performance.now() - started > timeoutMs) {
                loop.cancel()
                resolve()
                return
            }
            loop.schedule(tick)
        }
        loop.schedule(tick)
    })
}
