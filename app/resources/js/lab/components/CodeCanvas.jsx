import { useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { Prec } from '@codemirror/state'
import { tags as t } from '@lezer/highlight'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'

function languageForPath(path = '') {
    const lower = path.toLowerCase()
    if (lower.endsWith('.json')) return json()
    if (lower.endsWith('.md') || lower.endsWith('.mdx')) return markdown()
    if (lower.endsWith('.css')) return css()
    if (lower.endsWith('.html') || lower.endsWith('.svg')) return html()
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
    return javascript()
}

function readCssVar(name, fallback) {
    if (typeof document === 'undefined') return fallback
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
}

function useLabThemeSignal() {
    const [tick, setTick] = useState(0)
    const [dark, setDark] = useState(() => (
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ))

    useEffect(() => {
        const root = document.documentElement
        const bump = () => {
            setDark(root.classList.contains('dark'))
            setTick((n) => n + 1)
        }
        bump()

        const classObserver = new MutationObserver(bump)
        classObserver.observe(root, { attributes: true, attributeFilter: ['class'] })

        // Theme Customizer writes <style id="krikkit-theme"> — re-read accent when it changes.
        const styleObserver = new MutationObserver(bump)
        const watchThemeStyle = () => {
            const el = document.getElementById('krikkit-theme')
            if (el) styleObserver.observe(el, { characterData: true, childList: true, subtree: true })
        }
        watchThemeStyle()
        const headObserver = new MutationObserver(watchThemeStyle)
        headObserver.observe(document.head, { childList: true })

        window.addEventListener('storage', bump)
        return () => {
            classObserver.disconnect()
            styleObserver.disconnect()
            headObserver.disconnect()
            window.removeEventListener('storage', bump)
        }
    }, [])

    return { dark, tick }
}

/**
 * Krikkit syntax — IDE-like contrast, intentionally not MagicFlow’s hex/layout.
 * (Similar role mapping only: keyword / string / tag / number / comment.)
 */
const highlightLight = HighlightStyle.define([
    { tag: t.keyword, color: '#6d28d9' },
    { tag: t.operator, color: '#3f3f46' },
    { tag: t.bool, color: '#c2410c' },
    { tag: t.null, color: '#c2410c' },
    { tag: t.number, color: '#b45309' },
    { tag: t.string, color: '#047857' },
    { tag: t.comment, color: '#94a3b8', fontStyle: 'italic' },
    { tag: t.propertyName, color: '#0369a1' },
    { tag: t.variableName, color: '#18181b' },
    { tag: t.definition(t.variableName), color: '#1e3a8a' },
    { tag: t.function(t.variableName), color: '#1d4ed8' },
    { tag: t.className, color: '#a16207' },
    { tag: t.typeName, color: '#a16207' },
    { tag: t.tagName, color: '#be123c' },
    { tag: t.attributeName, color: '#0e7490' },
    { tag: t.attributeValue, color: '#047857' },
    { tag: t.punctuation, color: '#71717a' },
    { tag: t.bracket, color: '#71717a' },
    { tag: t.meta, color: '#94a3b8' },
    { tag: t.invalid, color: '#dc2626' },
])

const highlightDark = HighlightStyle.define([
    { tag: t.keyword, color: '#d8b4fe' },
    { tag: t.operator, color: '#e4e4e7' },
    { tag: t.bool, color: '#fdba74' },
    { tag: t.null, color: '#fdba74' },
    { tag: t.number, color: '#fbbf24' },
    { tag: t.string, color: '#6ee7b7' },
    { tag: t.comment, color: '#71717a', fontStyle: 'italic' },
    { tag: t.propertyName, color: '#7dd3fc' },
    { tag: t.variableName, color: '#f4f4f5' },
    { tag: t.definition(t.variableName), color: '#e0e7ff' },
    { tag: t.function(t.variableName), color: '#93c5fd' },
    { tag: t.className, color: '#fde68a' },
    { tag: t.typeName, color: '#fde68a' },
    { tag: t.tagName, color: '#fb7185' },
    { tag: t.attributeName, color: '#67e8f9' },
    { tag: t.attributeValue, color: '#6ee7b7' },
    { tag: t.punctuation, color: '#a1a1aa' },
    { tag: t.bracket, color: '#a1a1aa' },
    { tag: t.meta, color: '#737373' },
    { tag: t.regexp, color: '#6ee7b7' },
    { tag: t.special(t.string), color: '#86efac' },
    { tag: t.invalid, color: '#f87171' },
])

/**
 * Selection + active line only — Theme Customizer `--color-accent`
 * (resolved to a concrete color so color-mix always paints).
 */
function buildLabMirrorTheme(dark) {
    const accent = readCssVar('--color-accent', dark ? '#ffffff' : '#27272a')
    const accentContent = readCssVar('--color-accent-content', accent)
    // Light needs a heavier wash or selection disappears on white canvas.
    const selectOpacity = dark ? 42 : 32
    const hoverOpacity = dark ? 14 : 10
    const blurOpacity = dark ? 24 : 18

    const selection = `color-mix(in oklab, ${accent} ${selectOpacity}%, transparent)`
    const selectionBlur = `color-mix(in oklab, ${accent} ${blurOpacity}%, transparent)`
    const hover = `color-mix(in oklab, ${accent} ${hoverOpacity}%, transparent)`

    return EditorView.theme(
        {
            '&': {
                backgroundColor: 'var(--color-krikkit-canvas)',
                color: 'var(--color-krikkit-fg)',
                height: '100%',
                fontSize: '13px',
            },
            '.cm-scroller': {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                lineHeight: '1.55',
                backgroundColor: 'var(--color-krikkit-canvas)',
                overflow: 'auto',
            },
            '.cm-content': {
                caretColor: accent,
                paddingBlock: '8px',
            },
            '.cm-cursor, .cm-dropCursor': {
                borderLeftColor: accent,
            },
            // Mouse drag selection
            '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground': {
                backgroundColor: `${selection} !important`,
            },
            '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
                backgroundColor: `${selection} !important`,
            },
            '&:not(.cm-focused) > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
                backgroundColor: `${selectionBlur} !important`,
            },
            '.cm-content ::selection': {
                backgroundColor: selection,
            },
            '.cm-selectionMatch': {
                backgroundColor: selectionBlur,
            },
            // Active line (cursor line)
            '.cm-activeLine': {
                backgroundColor: hover,
            },
            '.cm-gutters': {
                backgroundColor: 'var(--color-krikkit-canvas)',
                color: 'var(--color-krikkit-subtle)',
                border: 'none',
                borderRight: '1px solid var(--color-krikkit-line)',
            },
            '.cm-gutter': {
                backgroundColor: 'var(--color-krikkit-canvas)',
            },
            '.cm-activeLineGutter': {
                backgroundColor: hover,
                color: accentContent,
            },
            '.cm-lineNumbers .cm-gutterElement': {
                paddingInline: '12px 10px',
                color: 'var(--color-krikkit-subtle)',
            },
            '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
                backgroundColor: selectionBlur,
            },
        },
        { dark },
    )
}

/**
 * Lab code canvas — colorful syntax + accent-driven selection / active line.
 */
export function CodeCanvas({
    path = '',
    value = '',
    onChange,
    active = true,
    readOnly = false,
}) {
    const { dark, tick } = useLabThemeSignal()
    const language = useMemo(() => languageForPath(path), [path])

    const extensions = useMemo(() => [
        language,
        buildLabMirrorTheme(dark),
        Prec.highest(syntaxHighlighting(dark ? highlightDark : highlightLight)),
        drawSelection({ cursorBlinkRate: 1200 }),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        EditorView.lineWrapping,
    ], [language, dark, tick])

    const fileName = path.split('/').pop() || path || 'untitled'
    const isBinaryPreview = /\.(png|jpe?g|gif|webp)$/i.test(path)

    return (
        <div className={[
            'lab-code-canvas flex h-full min-h-0 flex-col bg-krikkit-canvas',
            active ? '' : 'hidden',
        ].join(' ')}
        >
            <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-krikkit-line bg-krikkit-canvas px-3">
                <p className="min-w-0 truncate text-xs font-medium text-krikkit-fg" title={path || fileName}>
                    {fileName}
                </p>
                <span className="min-w-0 max-w-[50%] truncate text-[11px] text-krikkit-subtle" title={path || undefined}>
                    {readOnly || isBinaryPreview ? 'preview' : (path || 'editing')}
                </span>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-krikkit-canvas">
                {isBinaryPreview ? (
                    <div className="flex h-full items-center justify-center px-6 text-center">
                        <p className="max-w-sm text-sm text-krikkit-muted">
                            Binary image preview is not available in the demo canvas.
                        </p>
                    </div>
                ) : (
                    <CodeMirror
                        key={`${dark ? 'd' : 'l'}-${tick}`}
                        value={value}
                        height="100%"
                        theme="none"
                        editable={! readOnly}
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: false,
                            highlightActiveLine: false,
                            highlightActiveLineGutter: false,
                            drawSelection: false,
                            highlightSelectionMatches: false,
                            bracketMatching: true,
                            autocompletion: false,
                            syntaxHighlighting: false,
                        }}
                        extensions={extensions}
                        onChange={(next) => onChange?.(next)}
                        className="lab-codemirror h-full [&_.cm-editor]:h-full [&_.cm-editor]:outline-none"
                    />
                )}
            </div>
        </div>
    )
}
