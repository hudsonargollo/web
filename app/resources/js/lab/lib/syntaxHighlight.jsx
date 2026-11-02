import { useMemo } from 'react'
import { HighlightStyle } from '@codemirror/language'
import { tags as t, highlightTree } from '@lezer/highlight'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'

/** Same language pick as CodeCanvas — kept local so write-tool diffs stay light. */
export function languageForPath(path = '') {
    const lower = path.toLowerCase()
    if (lower.endsWith('.json')) return json()
    if (lower.endsWith('.md') || lower.endsWith('.mdx')) return markdown()
    if (lower.endsWith('.css') || lower.endsWith('.scss')) return css()
    if (lower.endsWith('.html') || lower.endsWith('.svg') || lower.endsWith('.blade.php')) return html()
    if (
        lower.endsWith('.js')
        || lower.endsWith('.jsx')
        || lower.endsWith('.ts')
        || lower.endsWith('.tsx')
        || lower.endsWith('.mjs')
        || lower.endsWith('.cjs')
    ) {
        return javascript({ jsx: true, typescript: lower.includes('.ts') })
    }
    // PHP and unknowns: JS lexer still colors strings/numbers/keywords usefully enough.
    return javascript()
}

/** Class-based tokens — colors live in app.css (light + .dark). */
const tokenStyle = HighlightStyle.define([
    { tag: t.keyword, class: 'lab-tok-keyword' },
    { tag: t.operator, class: 'lab-tok-operator' },
    { tag: t.bool, class: 'lab-tok-bool' },
    { tag: t.null, class: 'lab-tok-bool' },
    { tag: t.number, class: 'lab-tok-number' },
    { tag: t.string, class: 'lab-tok-string' },
    { tag: t.comment, class: 'lab-tok-comment' },
    { tag: t.propertyName, class: 'lab-tok-property' },
    { tag: t.variableName, class: 'lab-tok-variable' },
    { tag: t.definition(t.variableName), class: 'lab-tok-definition' },
    { tag: t.function(t.variableName), class: 'lab-tok-function' },
    { tag: t.className, class: 'lab-tok-type' },
    { tag: t.typeName, class: 'lab-tok-type' },
    { tag: t.tagName, class: 'lab-tok-tag' },
    { tag: t.attributeName, class: 'lab-tok-attr' },
    { tag: t.attributeValue, class: 'lab-tok-string' },
    { tag: t.punctuation, class: 'lab-tok-punct' },
    { tag: t.bracket, class: 'lab-tok-punct' },
    { tag: t.meta, class: 'lab-tok-meta' },
    { tag: t.regexp, class: 'lab-tok-string' },
    { tag: t.special(t.string), class: 'lab-tok-string' },
    { tag: t.invalid, class: 'lab-tok-invalid' },
])

/**
 * Tokenize `code` into { text, className } spans for a React render.
 */
export function tokenizeCode(code = '', path = '') {
    const source = String(code)
    if (! source) return []

    try {
        const lang = languageForPath(path)
        const tree = lang.language.parser.parse(source)
        const spans = []
        let pos = 0

        highlightTree(tree, tokenStyle, (from, to, classes) => {
            if (from > pos) {
                spans.push({ text: source.slice(pos, from), className: '' })
            }
            spans.push({ text: source.slice(from, to), className: classes || '' })
            pos = to
        })

        if (pos < source.length) {
            spans.push({ text: source.slice(pos), className: '' })
        }

        return spans.length ? spans : [{ text: source, className: '' }]
    } catch {
        return [{ text: source, className: '' }]
    }
}

/** Highlighted monospace line for write-tool diffs. */
export function HighlightedCode({ code = '', path = '', className = '' }) {
    const spans = useMemo(() => tokenizeCode(code, path), [code, path])

    return (
        <code className={['font-mono', className].filter(Boolean).join(' ')}>
            {spans.map((span, i) => (
                span.className ? (
                    <span key={i} className={span.className}>{span.text}</span>
                ) : (
                    <span key={i}>{span.text}</span>
                )
            ))}
        </code>
    )
}
