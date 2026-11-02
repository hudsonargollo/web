/**
 * Extract + strip mandatory <thought>…</thought> so tags never paint in chat.
 * Thought body is treated as raw unformatted prose (list markers collapsed).
 *
 * @returns {{ visible: string, thought: string }}
 */

/**
 * Normalize thought body to continuous prose: strip list markers / key-value
 * checklist lines so UI never shows templated bullets even if the model slips.
 */
export function sanitizeThoughtProse(text = '') {
    const raw = String(text || '').replace(/\r\n/g, '\n').trim()
    if (! raw) return ''

    const paragraphs = []
    let bucket = []

    const flush = () => {
        if (! bucket.length) return
        paragraphs.push(bucket.join(' ').replace(/\s+/g, ' ').trim())
        bucket = []
    }

    for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (! trimmed) {
            flush()
            continue
        }

        // Strip leading bullets / numbers / checklist keys ("- Foo:", "1. Bar").
        const cleaned = trimmed
            .replace(/^[-*•–—]\s+/, '')
            .replace(/^\d+[.)]\s+/, '')
            .replace(/^[A-Za-z][.)]\s+/, '')
            .replace(/^(?:What|Current|Do I|If executor|User request|Stage|Tools?)\s*:\s*/i, '')
            .trim()

        if (cleaned) bucket.push(cleaned)
    }
    flush()

    return paragraphs.join('\n\n').trim()
}

export function stripThoughtBlock(text = '') {
    let thoughtParts = []
    let visible = String(text || '')

    visible = visible.replace(/<thought>\s*([\s\S]*?)\s*<\/thought>/giu, (_, body) => {
        const trimmed = sanitizeThoughtProse(body)
        if (trimmed) thoughtParts.push(trimmed)
        return '\n'
    })

    const open = visible.match(/<thought>\s*([\s\S]*)$/iu)
    if (open) {
        const trimmed = sanitizeThoughtProse(open[1] || '')
        if (trimmed) thoughtParts.push(trimmed)
        visible = visible.slice(0, open.index)
    }

    visible = visible.replace(/\s*<\/thought>\s*/giu, '\n')
    visible = visible.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

    return {
        visible,
        thought: thoughtParts.join('\n\n').trim(),
    }
}
