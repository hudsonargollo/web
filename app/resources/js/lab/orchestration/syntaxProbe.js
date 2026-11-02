/**
 * Syntax gate for AI-written JS/JSX — acorn + acorn-jsx (MIT).
 *
 * Lezer (CodeMirror) is an error-tolerant editor grammar: it inserts
 * zero-width error nodes on valid files and was rejecting ~100-line
 * components as "truncated". The write gate must match the bundler
 * (strict parse), not the highlighter.
 */

import * as acorn from 'acorn'
import jsx from 'acorn-jsx'

const MAX_PROBE_BYTES = 400_000
const JS_SOURCE = /\.(jsx?|tsx?|mjs)$/i

const JsxParser = acorn.Parser.extend(jsx())

const PARSE_OPTS = Object.freeze({
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowAwaitOutsideFunction: true,
    allowHashBang: true,
    allowReturnOutsideFunction: false,
    locations: true,
})

function isJsSource(path) {
    return JS_SOURCE.test(String(path || ''))
}

function acornMessage(error) {
    const raw = error instanceof Error ? error.message : String(error || 'Syntax error')
    return raw.replace(/\s*\(\d+:\d+\)\s*$/, '').trim() || 'Syntax error'
}

/**
 * @param {string} path
 * @param {string} body
 * @returns {{ line: number, message: string }[]}
 */
export function probeSourceSyntax(path, body) {
    const source = String(body ?? '')
    if (! isJsSource(path) || ! source.trim() || source.length > MAX_PROBE_BYTES) return []

    try {
        JsxParser.parse(source, PARSE_OPTS)
        return []
    } catch (error) {
        const line = Number(error?.loc?.line) > 0 ? Number(error.loc.line) : 1
        return [{ line, message: acornMessage(error) }]
    }
}

/**
 * Compile-probe over this turn's pending writes.
 *
 * @param {Record<string, string>} pending path → body
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function probePendingSources(pending = {}) {
    const errors = []
    for (const [path, body] of Object.entries(pending)) {
        if (body == null) continue
        for (const issue of probeSourceSyntax(path, String(body))) {
            errors.push(`${path} (line ${issue.line}): ${issue.message}`)
            if (errors.length >= 6) return { ok: false, errors }
        }
    }
    return { ok: errors.length === 0, errors }
}

const MALFORMED_CLOSER = /^(\s*)([A-Za-z][\w.-]*)>(\s*)$/gm
const MISMATCH_CLOSE = /Expected corresponding JSX closing tag for <([^>]+)> but found <\/([^>]+)>/

/**
 * Last-resort mechanical repair. Prefer not needing this — the write
 * pipeline should land complete files. Only commits when acorn is clean.
 *
 * @param {string} path
 * @param {string} body
 * @returns {{ body: string, healed: boolean, fixes: string[] }}
 */
export function healSourceSyntax(path, body) {
    const original = String(body ?? '')
    if (! isJsSource(path) || ! original.trim() || original.length > MAX_PROBE_BYTES) {
        return { body: original, healed: false, fixes: [] }
    }

    let current = original
    const fixes = []

    const closerCandidate = current.replace(MALFORMED_CLOSER, (_, indent, name, tail) => {
        fixes.push(`</${name}>`)
        return `${indent}</${name}>${tail}`
    })
    if (closerCandidate !== current) {
        const before = probeSourceSyntax(path, current).length
        const after = probeSourceSyntax(path, closerCandidate).length
        if (after < before) current = closerCandidate
        else fixes.length = 0
    }

    for (let step = 0; step < 3; step += 1) {
        const issues = probeSourceSyntax(path, current)
        const hit = issues.find((issue) => MISMATCH_CLOSE.test(issue.message))
        if (! hit) break
        const match = hit.message.match(MISMATCH_CLOSE)
        const lines = current.split('\n')
        const idx = hit.line - 1
        if (! match || idx < 0 || idx >= lines.length) break
        const nextLine = lines[idx].replace(new RegExp(`</${escapeReg(match[2])}\\b`), `</${match[1]}`)
        if (nextLine === lines[idx]) break
        lines[idx] = nextLine
        const candidate = lines.join('\n')
        if (probeSourceSyntax(path, candidate).length >= issues.length) break
        current = candidate
        fixes.push(`</${match[2]}> → </${match[1]}>`)
    }

    if (probeSourceSyntax(path, current).length && looksTruncated(path, current)) {
        const closed = healTruncatedBody(path, current)
        if (closed !== current && probeSourceSyntax(path, closed).length === 0) {
            current = closed
            fixes.push('closed truncated file')
        }
    }

    const clean = probeSourceSyntax(path, current).length === 0
    if (! clean || current === original) {
        return { body: original, healed: false, fixes: [] }
    }
    return { body: current, healed: true, fixes }
}

function escapeReg(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const PAIR = { '{': '}', '(': ')', '[': ']' }

function looksTruncated(path, body) {
    const issues = probeSourceSyntax(path, body)
    if (! issues.length) return false
    const lines = String(body).split('\n').length
    return issues.some((issue) => (
        /unterminated|unexpected end|end of input|truncated|unbalanced/i.test(issue.message)
        || issue.line >= Math.max(1, lines - 2)
    ))
}

function healTruncatedBody(path, body) {
    const attempts = [String(body ?? '')]
    let cursor = attempts[0]
    for (let step = 0; step < 3; step += 1) {
        const stripped = stripIncompleteTail(cursor)
        if (stripped === cursor) break
        attempts.push(stripped)
        cursor = stripped
    }

    for (const start of attempts) {
        const closed = closeTruncatedSource(start)
        if (probeSourceSyntax(path, closed).length === 0) return closed
    }
    return String(body ?? '')
}

function stripIncompleteTail(body) {
    const lines = String(body).split('\n')
    while (lines.length > 5) {
        const last = lines[lines.length - 1]
        if (last.trim() === '') {
            lines.pop()
            continue
        }
        const trimmed = last.trimEnd()
        if (/[>;{})\],]$/.test(trimmed) || /<\/[A-Za-z][\w.-]*>$/.test(trimmed) || /(?:\/>|['"`])$/.test(trimmed)) {
            break
        }
        lines.pop()
        break
    }
    return lines.join('\n')
}

function closeTruncatedSource(body) {
    let source = String(body ?? '')
    for (let pass = 0; pass < 3; pass += 1) {
        const state = scanSource(source)
        let mutated = false
        if (state.blockComment) {
            source += '*/'
            mutated = true
        }
        if (state.quote) {
            source += state.quote
            mutated = true
        }
        if (state.attrQuote) {
            source += state.attrQuote
            mutated = true
        }
        if (state.midTag) {
            const tail = source.trimEnd()
            source += /\{\s*$/.test(tail) ? '""}>' : '>'
            mutated = true
        }
        if (! mutated) {
            if (! state.tags.length && ! state.brackets.length) return source
            let suffix = ''
            while (state.tags.length) {
                const name = state.tags.pop()
                suffix += name ? `\n</${name}>` : '\n</>'
            }
            while (state.brackets.length) suffix += PAIR[state.brackets.pop()] || ''
            return `${source}${suffix}\n`
        }
    }
    return source
}

function scanSource(source) {
    const tags = []
    const brackets = []
    let i = 0
    let quote = null
    let lineComment = false
    let blockComment = false
    let midTag = false
    let attrQuote = null

    while (i < source.length) {
        const c = source[i]
        const n = source[i + 1] || ''

        if (lineComment) {
            if (c === '\n') lineComment = false
            i += 1
            continue
        }
        if (blockComment) {
            if (c === '*' && n === '/') {
                blockComment = false
                i += 2
                continue
            }
            i += 1
            continue
        }
        if (quote) {
            if (c === '\\') {
                i += 2
                continue
            }
            if (c === quote) quote = null
            i += 1
            continue
        }

        if (c === '/' && n === '/') {
            lineComment = true
            i += 2
            continue
        }
        if (c === '/' && n === '*') {
            blockComment = true
            i += 2
            continue
        }
        if (c === '"' || c === "'" || c === '`') {
            quote = c
            i += 1
            continue
        }

        if (c === '<' && n === '>') {
            tags.push('')
            i += 2
            continue
        }

        if (c === '<' && n === '/') {
            let j = i + 2
            while (j < source.length && source[j] !== '>') j += 1
            tags.pop()
            i = j + 1
            continue
        }

        if (c === '<' && /[A-Za-z]/.test(n)) {
            let j = i + 1
            let name = ''
            while (j < source.length && /[\w.-]/.test(source[j])) {
                name += source[j]
                j += 1
            }
            let selfClose = false
            let closed = false
            attrQuote = null
            while (j < source.length) {
                const ch = source[j]
                if (attrQuote) {
                    if (ch === '\\') {
                        j += 2
                        continue
                    }
                    if (ch === attrQuote) attrQuote = null
                    j += 1
                    continue
                }
                if (ch === '"' || ch === "'" || ch === '`') {
                    attrQuote = ch
                    j += 1
                    continue
                }
                if (ch === '/' && source[j + 1] === '>') {
                    selfClose = true
                    closed = true
                    j += 2
                    break
                }
                if (ch === '>') {
                    closed = true
                    j += 1
                    break
                }
                j += 1
            }
            if (! closed) {
                midTag = true
                i = source.length
                break
            }
            if (! selfClose && name && ! VOID_TAGS.has(name.toLowerCase())) {
                tags.push(name)
            }
            attrQuote = null
            i = j
            continue
        }

        if (c === '{' || c === '(' || c === '[') {
            brackets.push(c)
            i += 1
            continue
        }
        if (c === '}' || c === ')' || c === ']') {
            brackets.pop()
            i += 1
            continue
        }
        i += 1
    }

    return { tags, brackets, quote, blockComment, midTag, attrQuote }
}
