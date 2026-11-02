/**
 * Extract + strip ephemeral <suggestions>…</suggestions> chips.
 * Tags must never paint in chat markdown; chips live only in turn state.
 *
 * @returns {{ visible: string, suggestions: string[] }}
 */

const MAX_ITEMS = 3
const MAX_ITEM_CHARS = 80

function decodeList(raw = '') {
    const trimmed = String(raw || '').trim()
    if (! trimmed) return []

    try {
        const decoded = JSON.parse(trimmed)
        if (! Array.isArray(decoded)) return []
        return decoded
            .filter((value) => typeof value === 'string' || typeof value === 'number')
            .map((value) => String(value))
    } catch {
        return []
    }
}

function normalizeList(items = []) {
    const out = []
    const seen = new Set()

    for (const item of items) {
        let label = String(item || '').replace(/\s+/g, ' ').trim()
        if (! label) continue
        if (label.length > MAX_ITEM_CHARS) {
            label = `${label.slice(0, MAX_ITEM_CHARS - 1).trimEnd()}…`
        }
        const key = label.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push(label)
        if (out.length >= MAX_ITEMS) break
    }

    return out
}

export function stripSuggestions(text = '') {
    let suggestions = []
    let visible = String(text || '')

    visible = visible.replace(/<suggestions>\s*([\s\S]*?)\s*<\/suggestions>/giu, (_, body) => {
        suggestions = suggestions.concat(decodeList(body))
        return '\n'
    })

    const open = visible.match(/<suggestions>\s*([\s\S]*)$/iu)
    if (open) {
        suggestions = suggestions.concat(decodeList(open[1] || ''))
        visible = visible.slice(0, open.index)
    }

    visible = visible.replace(/\s*<\/suggestions>\s*/giu, '\n')
    visible = visible.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

    return {
        visible,
        suggestions: normalizeList(suggestions),
    }
}

/**
 * Hold back a trailing partial `<suggestions` so faux-stream never paints the tag.
 * Full closed blocks are stripped immediately.
 */
export function scrubSuggestionArtifacts(text = '') {
    let out = String(text || '')
    let suggestions = []

    out = out.replace(/<suggestions>\s*([\s\S]*?)\s*<\/suggestions>/giu, (_, body) => {
        suggestions = suggestions.concat(decodeList(body))
        return ''
    })

    // Hold incomplete open tag (and anything after) until a later chunk closes it.
    const partial = out.search(/<suggestions(?:\s|>|$)/iu)
    if (partial >= 0) {
        out = out.slice(0, partial)
    }

    out = out.replace(/\s*<\/suggestions>\s*/giu, '')
    out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')

    return { text: out, suggestions: normalizeList(suggestions) }
}
