import { classifyPreviewElement, previewElementSnippet } from './previewContextItems.js'

function slimElement(element) {
    if (! element) return null
    return {
        uid: element.uid ?? null,
        tag: element.tag || 'div',
        id: element.id || null,
        className: element.className || '',
        path: element.path || '',
        text: String(element.text || '').slice(0, 240),
        attributes: {
            href: element.attributes?.href || null,
            src: element.attributes?.src || null,
            alt: element.attributes?.alt || null,
            placeholder: element.attributes?.placeholder || null,
        },
    }
}

export function pillKind(element) {
    return classifyPreviewElement(element)
}

export function pillIcon(kind) {
    if (kind === 'text' || kind === 'button' || kind === 'field') return 'type'
    if (kind === 'link') return 'link'
    if (kind === 'media') return 'image'
    return 'card'
}

const TAG_LABELS = {
    p: 'Paragraph',
    span: 'Text',
    h1: 'Heading',
    h2: 'Heading',
    h3: 'Heading',
    h4: 'Heading',
    h5: 'Heading',
    h6: 'Heading',
    a: 'Link',
    img: 'Image',
    button: 'Button',
    input: 'Field',
    textarea: 'Field',
    select: 'Field',
    section: 'Section',
    article: 'Article',
    aside: 'Aside',
    nav: 'Nav',
    header: 'Header',
    footer: 'Footer',
    ul: 'List',
    ol: 'List',
    li: 'Item',
    div: 'Block',
}

export function pillTitle(kind, element) {
    if (kind === 'text') return 'Text'
    if (kind === 'button') return 'Button'
    if (kind === 'link') return 'Link'
    if (kind === 'media') return String(element?.tag || '').toLowerCase() === 'img' ? 'Image' : 'Media'
    if (kind === 'field') return 'Field'
    const tag = String(element?.tag || '').toLowerCase()
    return TAG_LABELS[tag] || 'Block'
}

export function friendlyPillLabel(target) {
    const snippet = String(target?.snippet || '').replace(/\s+/g, ' ').trim()
    const title = String(target?.title || '').trim()
    const tag = String(target?.element?.tag || '').toLowerCase()
    const kind = TAG_LABELS[title.toLowerCase()] || TAG_LABELS[snippet.toLowerCase()] || TAG_LABELS[tag]
    if (snippet && ! TAG_LABELS[snippet.toLowerCase()] && snippet.length > 1) {
        return snippet
    }
    return kind || title || 'Element'
}

const COPY_ACTIONS = new Set([
    'change-text',
    'change-link',
    'change-src',
    'change-alt',
    'change-placeholder',
    'change-value',
])

function targetKey(target) {
    return String(target?.element?.uid ?? target?.element?.path ?? target?.id ?? '')
}

function hasLiveReplacement(target) {
    if (! target?.applied) return false
    if (Object.prototype.hasOwnProperty.call(target.applied, 'text')) return true
    if (target.applied.attrs && Object.keys(target.applied.attrs).length) return true
    return false
}

/** Change-text / rewrite / inspect pins need typed copy unless the live preview already holds the change. */
export function previewEditsNeedUserText(targets = []) {
    return targets.some((target) => {
        if (target.action === 'hide' || target.action === 'applied') return false
        if (hasLiveReplacement(target)) return false
        return true
    })
}

export function composerPlaceholderForEdits(targets = []) {
    if (! targets.length) return null
    if (targets.some((t) => t.action === 'applied' || t.action === 'hide' || t.applied) && ! previewEditsNeedUserText(targets)) {
        return 'Add a note, or send to apply in source…'
    }
    const action = targets.find((t) => COPY_ACTIONS.has(t.action))?.action
        || targets[0]?.action
    if (action === 'change-link') return 'New URL…'
    if (action === 'change-src') return 'New source…'
    if (action === 'change-alt') return 'New alt text…'
    if (action === 'change-placeholder') return 'New placeholder…'
    if (action === 'change-value') return 'New value…'
    if (action === 'change-text') return 'New text…'
    return 'Describe the change…'
}

const HIDDEN_DISPLAY = [
    'Update this text in the source.',
    'Apply these preview edits in the source files.',
    'Edit the selected preview element in the source.',
]

/** Visible chat body — never the hidden preview-edit prompt. */
export function stripPreviewEditPrompt(content = '') {
    let text = String(content || '')
    const idx = text.search(/\[Preview targets\b/i)
    if (idx >= 0) text = text.slice(0, idx)
    text = text.trim()
    if (HIDDEN_DISPLAY.some((line) => text === line)) return ''
    return text
}

export function slimPreviewEditsForWire(targets = []) {
    return targets.slice(0, 8).map((target) => ({
        id: target.id,
        kind: target.kind,
        icon: target.icon,
        action: target.action,
        title: target.title,
        snippet: target.snippet,
        element: target.element,
        applied: target.applied || null,
    }))
}

export function makeEditTarget({ element, action = 'edit', applied = null } = {}) {
    const kind = pillKind(element)
    return {
        id: `edit-${element?.uid ?? Date.now()}-${action}`,
        kind,
        icon: pillIcon(kind),
        action,
        title: pillTitle(kind, element),
        snippet: previewElementSnippet(element),
        element: slimElement(element),
        applied: applied || null,
    }
}

export function upsertEditTarget(list, next) {
    const key = targetKey(next)
    if (! key) return [...list, next].slice(-8)
    const idx = list.findIndex((row) => targetKey(row) === key)
    if (idx < 0) return [...list, next].slice(-8)
    const prev = list[idx]
    const copy = [...list]
    copy[idx] = {
        ...prev,
        ...next,
        id: prev.id,
        applied: next.applied
            ? {
                ...prev.applied,
                ...next.applied,
                styles: { ...(prev.applied?.styles || {}), ...(next.applied?.styles || {}) },
                attrs: { ...(prev.applied?.attrs || {}), ...(next.applied?.attrs || {}) },
            }
            : prev.applied,
        snippet: next.snippet || prev.snippet,
    }
    return copy
}

export function previewEditsForApi(targets = [], userText = '') {
    if (! targets.length) return ''
    const requested = String(userText || '').trim()
    const blocks = targets.map((target, index) => {
        const el = target.element || {}
        const action = target.action || 'edit'
        const lines = [
            `${index + 1}. ${target.kind} <${el.tag || 'div'}> action=${action} ${el.path || ''}`.trim(),
        ]
        if (el.text) lines.push(`current text: "${el.text}"`)
        if (el.attributes?.href) lines.push(`href: ${el.attributes.href}`)
        if (el.attributes?.src) lines.push(`src: ${el.attributes.src}`)
        if (target.applied?.text) {
            lines.push(`LIVE PREVIEW already shows text: "${target.applied.text}" — persist this in source.`)
        }
        if (target.applied?.attrs && Object.keys(target.applied.attrs).length) {
            lines.push(`LIVE PREVIEW attrs: ${JSON.stringify(target.applied.attrs)} — persist in source.`)
        }
        if (target.applied?.styles && Object.keys(target.applied.styles).length) {
            lines.push(`LIVE PREVIEW styles: ${JSON.stringify(target.applied.styles)} — persist in source.`)
        }
        if (COPY_ACTIONS.has(action) && requested && ! target.applied?.text) {
            const field = action === 'change-link'
                ? 'href'
                : action === 'change-src'
                    ? 'src'
                    : action === 'change-alt'
                        ? 'alt'
                        : action === 'change-placeholder'
                            ? 'placeholder'
                            : action === 'change-value'
                                ? 'value'
                                : 'text'
            lines.push(`requested new ${field} (use this exact copy, do not paraphrase): "${requested}"`)
            lines.push(`Replace the current ${field} in the source file with that exact string via write_file.`)
        } else if (requested && ! target.applied) {
            lines.push(`User request: "${requested}"`)
            lines.push('Apply this in VFS with write_file.')
        } else if (! target.applied) {
            lines.push('Apply the user message in VFS with write_file.')
        }
        return lines.join('\n')
    })
    return `\n\n[Preview targets — edit these elements in the source files with write_file. Do not only restyle the live DOM.]\n${blocks.join('\n\n')}`
}

export function previewEditsDisplayText() {
    return ''
}
