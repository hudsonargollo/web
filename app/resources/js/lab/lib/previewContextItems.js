/**
 * Type-aware preview context actions.
 */

const TEXT_TAGS = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'span', 'li', 'label', 'figcaption', 'blockquote',
    'strong', 'em', 'small', 'td', 'th', 'dt', 'dd', 'legend',
])

export function classifyPreviewElement(element) {
    const tag = String(element?.tag || '').toLowerCase()
    const role = String(element?.attributes?.role || '').toLowerCase()
    const type = String(element?.attributes?.type || '').toLowerCase()
    const href = element?.attributes?.href
    const text = String(element?.text || '').trim()

    if (tag === 'img' || tag === 'picture' || tag === 'svg' || tag === 'video' || tag === 'audio') {
        return 'media'
    }
    if (tag === 'a' || (href && tag !== 'link')) return 'link'
    if (tag === 'button' || role === 'button' || (tag === 'input' && (type === 'button' || type === 'submit'))) {
        return 'button'
    }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'field'
    if (TEXT_TAGS.has(tag) && text) return 'text'
    return 'box'
}

export function previewElementSnippet(element) {
    const text = String(element?.text || '').replace(/\s+/g, ' ').trim()
    if (text) return text.length > 64 ? `${text.slice(0, 63)}…` : text
    const src = element?.attributes?.src || element?.attributes?.href
    if (src) return String(src).slice(0, 64)
    return element?.path || element?.tag || 'element'
}

export function buildPreviewContextItems(element) {
    const kind = classifyPreviewElement(element)
    const items = []

    if (kind === 'text' || kind === 'button' || kind === 'link') {
        items.push({
            id: 'change-text',
            label: kind === 'button' ? 'Change label' : 'Change text',
        })
        items.push({ id: 'copy', label: 'Copy' })
    }
    if (kind === 'link') {
        items.push({ id: 'change-link', label: 'Change link' })
    }
    if (kind === 'media') {
        items.push({ id: 'change-src', label: 'Change source' })
        if (element?.tag === 'img') {
            items.push({ id: 'change-alt', label: 'Change alt text' })
        }
    }
    if (kind === 'field') {
        items.push({ id: 'change-placeholder', label: 'Change placeholder' })
        if (element?.attributes?.value != null || element?.tag === 'input') {
            items.push({ id: 'change-value', label: 'Change value' })
        }
    }

    items.push({
        id: 'ask-lab',
        label: kind === 'text' || kind === 'button' ? 'Rewrite with Lab' : 'Edit with Lab',
    })
    items.push({ id: 'sep-1', sep: true })
    items.push({ id: 'hide', label: 'Hide' })
    items.push({ id: 'copy-selector', label: 'Copy selector' })
    items.push({ id: 'sep-2', sep: true })
    items.push({ id: 'inspect', label: 'Inspect' })

    return { kind, items }
}

export function askLabPrompt(element) {
    const kind = classifyPreviewElement(element)
    const tag = element?.tag || 'element'
    const path = element?.path || tag
    const snippet = String(element?.text || '').replace(/\s+/g, ' ').trim()
    const href = element?.attributes?.href
    const src = element?.attributes?.src

    const lines = [
        `Edit this ${tag} in the preview.`,
        `Selector: ${path}`,
    ]
    if (snippet) lines.push(`Current ${kind === 'button' ? 'label' : 'text'}: "${snippet.slice(0, 240)}"`)
    if (href) lines.push(`href: ${href}`)
    if (src) lines.push(`src: ${src}`)
    lines.push('Keep the layout. Only change what I ask next.')
    return lines.join('\n')
}
