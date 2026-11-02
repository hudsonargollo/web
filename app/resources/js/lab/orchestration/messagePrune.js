/**
 * Client-side conversation pruning before Lab chat requests.
 * Mirrors App\Ai\Support\ConversationPruner — last ~2 steps only keep heavy tool bodies.
 */

/** ~2 user/assistant steps. */
export const KEEP_RECENT_MESSAGES = 4
export const MAX_OLDER_MESSAGE_CHARS = 600
export const MAX_RECENT_MESSAGE_CHARS = 8_000
export const MAX_STALE_TOOL_CHARS = 360

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {{ keep?: number }} [opts]
 * @returns {Array<{ role: string, content: string }>}
 */
export function pruneConversationMessages(messages = [], { keep = KEEP_RECENT_MESSAGES } = {}) {
    const rows = Array.isArray(messages) ? messages : []
    if (! rows.length) return []

    const keepN = Math.max(2, keep)
    const cut = Math.max(0, rows.length - keepN)
    const last = rows.length - 1

    return rows.map((row, index) => {
        const role = String(row?.role || 'user')
        const content = String(row?.content ?? '')
        const isRecent = index >= cut
        const keepToolBodies = index === last || index >= last - 1
        return {
            role,
            content: isRecent
                ? pruneRecentMessage(content, keepToolBodies)
                : pruneOlderMessage(content),
        }
    })
}

function pruneRecentMessage(content, keepToolBodies) {
    const trimmed = String(content || '').trim()
    if (trimmed.includes('[TOOL_RESULTS') && ! keepToolBodies) {
        return summarizeToolResults(trimmed)
    }
    let stripped = stripHeavyJsonFields(content, keepToolBodies)
    stripped = stripDirectoryScans(stripped, ! keepToolBodies)
    if (stripped.length <= MAX_RECENT_MESSAGE_CHARS) return stripped
    return `${stripped.slice(0, MAX_RECENT_MESSAGE_CHARS - 1)}…`
}

function pruneOlderMessage(content) {
    const trimmed = String(content || '').trim()
    if (! trimmed) return ''

    if (trimmed.includes('[TOOL_RESULTS')) {
        return summarizeToolResults(trimmed)
    }

    if (/\[(SYSTEM AUTO-REPAIR|COMPILE|RUNTIME ERROR|VFS_HEAL|SHELL)/i.test(trimmed)) {
        const flat = trimmed.replace(/\s+/g, ' ')
        return flat.length <= MAX_OLDER_MESSAGE_CHARS
            ? flat
            : `${flat.slice(0, MAX_OLDER_MESSAGE_CHARS - 1)}…`
    }

    let stripped = stripDirectoryScans(stripHeavyJsonFields(trimmed, false), true)
    if (stripped.length <= MAX_OLDER_MESSAGE_CHARS) return stripped
    return `${stripped.slice(0, MAX_OLDER_MESSAGE_CHARS - 1)}…`
}

function summarizeToolResults(content) {
    const round = content.match(/\[TOOL_RESULTS\s*[—\-]\s*round\s*(\d+)/u)?.[1]
    const tools = content.match(/Previous tools:\s*(.+)/u)?.[1]?.trim()
    const statuses = [...content.matchAll(/"status"\s*:\s*"([^"]+)"/g)].map((m) => m[1]).slice(0, 6)

    const hint = round ? `round ${round}` : 'prior round'
    const toolBit = tools ? `; tools=${tools}` : ''
    const statusBit = statuses.length ? `; statuses=${statuses.join(',')}` : ''
    const summary = `[TOOL_RESULTS pruned — ${hint}${toolBit}${statusBit}] Stale list_dir/read/compile payloads dropped. Re-read if needed.`
    return summary.length <= MAX_STALE_TOOL_CHARS
        ? summary
        : `${summary.slice(0, MAX_STALE_TOOL_CHARS - 1)}…`
}

function stripDirectoryScans(content, aggressive) {
    const limit = aggressive ? 0 : 8
    const patterns = [
        /("items"\s*:\s*)(\[[^\]]*\])/gus,
        /("hits"\s*:\s*)(\[[^\]]*\])/gus,
        /("entries"\s*:\s*)(\[[^\]]*\])/gus,
    ]
    let out = content
    for (const re of patterns) {
        out = out.replace(re, (_, open, arr) => {
            try {
                const decoded = JSON.parse(arr)
                if (! Array.isArray(decoded)) return `${open}[]`
                if (limit <= 0) {
                    return `${open}${JSON.stringify({ _pruned: true, count: decoded.length })}`
                }
                const slice = decoded.slice(0, limit)
                if (decoded.length > limit) {
                    slice.push({ _pruned: true, omitted: decoded.length - limit })
                }
                return `${open}${JSON.stringify(slice)}`
            } catch {
                return `${open}[]`
            }
        })
    }
    return out
}

function stripHeavyJsonFields(content, keepPreview) {
    const patterns = [
        { re: /("contentPreview"\s*:\s*")((?:\\.|[^"\\])*)(")/gu, limit: keepPreview ? 1_600 : 80 },
        { re: /("exactSnippet"\s*:\s*")((?:\\.|[^"\\])*)(")/gu, limit: keepPreview ? 1_600 : 80 },
        { re: /("fullContent"\s*:\s*")((?:\\.|[^"\\])*)(")/gu, limit: 80 },
    ]

    let out = content
    for (const { re, limit } of patterns) {
        out = out.replace(re, (full, open, body, close) => {
            const raw = body.replace(/\\n/g, '\n').replace(/\\"/g, '"')
            if (raw.length <= limit) return full
            const slice = `${raw.slice(0, limit)}…[pruned]`
            return `${open}${slice.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}${close}`
        })
    }
    return out
}
