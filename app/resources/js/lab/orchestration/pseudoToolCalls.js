/**
 * Client safety net: recover native tool_calls from prose/JSON/fenced file
 * bodies when the provider tool_calls channel was empty.
 * Mirrors App\Ai\Lab\PseudoToolCallParser (+ extractFileBlocks).
 */

import { extractFileBlocks } from '../lib/chatTools.js'
import { normalizeVfsPath } from '../lib/vfs.js'

const ALLOWED = new Set([
    'list_dir',
    'file_search',
    'grep',
    'read_file',
    'write_file',
    'lookup_visuals',
    'survey_datastore',
    'revise_datastore',
    'github_status',
    'github_compare',
    'github_push',
    'github_pull',
    'github_fork',
    'github_link',
    'github_create_repo',
])

/**
 * @param {string} content
 * @param {Array<{ id?: string, name: string, arguments?: object }>|null} existing
 * @param {{ vfsContents?: Record<string, string> }} [opts]
 * @returns {{ toolCalls: array, content: string, recovered: boolean }}
 */
export function recoverPseudoToolCalls(content = '', existing = null, opts = {}) {
    const prior = Array.isArray(existing)
        ? existing.filter((c) => c?.name && ALLOWED.has(String(c.name)))
        : []
    if (prior.length) {
        return { toolCalls: prior, content: String(content || ''), recovered: false }
    }

    const raw = String(content || '')
    const vfsContents = normalizeVfsMap(opts?.vfsContents)
    if (! raw.trim()) {
        return { toolCalls: [], content: raw, recovered: false }
    }

    const found = []
    const spans = []

    for (const candidate of extractJsonCandidates(raw)) {
        const calls = toolCallsFromDecoded(candidate.value)
        if (! calls.length) continue
        found.push(...calls)
        spans.push([candidate.start, candidate.end])
    }

    for (const candidate of extractFunctionStyleCalls(raw)) {
        found.push(candidate.call)
        spans.push([candidate.start, candidate.end])
    }

    // Markdown fenced file bodies (```jsx src/App.jsx … ```) → write_file
    for (const block of extractFileBlocks(raw)) {
        if (! block?.path || block.content == null) continue
        const call = fileBodyToToolCall(block.path, String(block.content), vfsContents)
        if (call) found.push(call)
    }

    // Prose “Write src/App.jsx” / “Updated App.jsx” + following fence without path meta
    for (const candidate of extractProseWriteFences(raw, vfsContents)) {
        found.push(candidate.call)
        spans.push([candidate.start, candidate.end])
    }

    // Standalone unified diffs / “Updated path” without a fence
    for (const candidate of extractStandaloneDiffs(raw, vfsContents)) {
        found.push(candidate.call)
        spans.push([candidate.start, candidate.end])
    }

    // XML-style pseudo tools (<write_file><path>…</path><content>…</content></write_file>)
    for (const candidate of extractXmlStyleCalls(raw, vfsContents)) {
        found.push(candidate.call)
        spans.push([candidate.start, candidate.end])
    }

    if (! found.length) {
        return { toolCalls: [], content: raw, recovered: false }
    }

    const seen = new Set()
    const unique = []
    for (const call of found) {
        const key = `${call.name}|${String(call.arguments?.path || '')}|${String(call.arguments?.content || call.arguments?.replace || '').length}`
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(call)
    }

    // Strip JSON/function spans; leave prose (fences may still show — executor owns truth).
    const clean = stripSpans(raw, spans).replace(/\n{3,}/g, '\n\n').trim()

    if (typeof console !== 'undefined') {
        console.info('[lab:pseudo-tools] recovered', unique.map((c) => ({
            name: c.name,
            path: c.arguments?.path,
            bytes: String(c.arguments?.content || c.arguments?.replace || '').length,
        })))
    }

    return { toolCalls: unique, content: clean || raw, recovered: true }
}

function normalizeVfsMap(raw) {
    /** @type {Record<string, string>} */
    const out = Object.create(null)
    if (! raw || typeof raw !== 'object') return out
    for (const [key, value] of Object.entries(raw)) {
        const path = normalizeVfsPath(key)
        if (! path) continue
        out[path] = value == null ? '' : String(value)
    }
    return out
}

/**
 * Map a fenced / prose body onto write_file using existing VFS.
 */
function fileBodyToToolCall(rawPath, body, vfsContents) {
    let path = normalizeVfsPath(rawPath) || rawPath
    if (path && ! path.includes('/') && /\.(jsx?|tsx?|css|html)$/i.test(path)) {
        path = `src/${path}`
    }
    const content = String(body || '')
    if (! path || ! content.trim()) return null

    const existing = Object.prototype.hasOwnProperty.call(vfsContents, path)
        ? vfsContents[path]
        : ''

    if (looksLikeUnifiedDiff(content)) {
        const patched = applyUnifiedDiff(existing, content)
        if (patched != null && patched !== existing) {
            return {
                id: `diff_${Date.now().toString(36)}`,
                name: 'write_file',
                arguments: { path, content: patched },
            }
        }
        // Diff without clean apply — still prefer a full write of the raw body
        // over inventing apply_patch.
    }

    if (existing && looksPartialUpdate(content, existing)) {
        const merged = mergePartialIntoFile(existing, content)
        if (merged != null && merged !== existing) {
            return {
                id: `partial_${Date.now().toString(36)}`,
                name: 'write_file',
                arguments: { path, content: merged },
            }
        }
    }

    return {
        id: `fence_${Date.now().toString(36)}`,
        name: 'write_file',
        arguments: { path, content },
    }
}

function looksLikeUnifiedDiff(text) {
    const t = String(text || '')
    if (/^diff --git |\n@@ |^--- |\+\+\+ /m.test(t)) return true
    const lines = t.split('\n')
    let plus = 0
    let minus = 0
    for (const line of lines) {
        if (/^\+[^+]/.test(line) || line === '+') plus += 1
        else if (/^-[^-]/.test(line) || line === '-') minus += 1
    }
    return plus + minus >= 2 && (plus + minus) >= Math.floor(lines.length * 0.4)
}

function looksPartialUpdate(content, existing) {
    if (! existing) return false
    if (content.length >= existing.length * 0.85) return false
    if (looksLikeUnifiedDiff(content)) return true
    const hasModule = /^\s*(import|export)\s/m.test(existing)
    const contentHasModule = /^\s*(import|export)\s/m.test(content)
    if (hasModule && ! contentHasModule) return true
    // Body-only rewrite: existing has imports, snippet does not.
    if (/^\s*import\s/m.test(existing) && ! /^\s*import\s/m.test(content)) return true
    return content.length < existing.length * 0.55
}

function mergePartialIntoFile(existing, partial) {
    const body = String(partial || '').trim()
    if (! body) return null

    if (looksLikeUnifiedDiff(body)) {
        return applyUnifiedDiff(existing, body)
    }

    const anchors = firstLastAnchors(body)
    if (anchors) {
        const start = existing.indexOf(anchors.first)
        if (start >= 0) {
            const end = existing.indexOf(anchors.last, start)
            if (end >= start) {
                return existing.slice(0, start) + body + existing.slice(end + anchors.last.length)
            }
        }
    }

    return null
}

function firstLastAnchors(text) {
    const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) return null
    return { first: lines[0], last: lines[lines.length - 1] }
}

/**
 * Very small unified-diff applier for recovered prose patches.
 * Supports hunks with @@ headers; falls back to +/- line pairs.
 */
function applyUnifiedDiff(existing, diffText) {
    const lines = String(diffText || '').replace(/\r\n/g, '\n').split('\n')
    const fileLines = String(existing || '').split('\n')
    let cursor = 0
    let out = [...fileLines]
    let touched = false

    let i = 0
    while (i < lines.length) {
        const line = lines[i]
        const hunk = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/.exec(line)
        if (hunk) {
            cursor = Math.max(0, Number(hunk[1]) - 1)
            i += 1
            while (i < lines.length && ! /^@@ /.test(lines[i]) && ! /^diff --git /.test(lines[i])) {
                const row = lines[i]
                if (row.startsWith('+') && ! row.startsWith('+++')) {
                    out.splice(cursor, 0, row.slice(1))
                    cursor += 1
                    touched = true
                } else if (row.startsWith('-') && ! row.startsWith('---')) {
                    out.splice(cursor, 1)
                    touched = true
                } else if (row.startsWith(' ') || row === '') {
                    cursor += 1
                }
                i += 1
            }
            continue
        }
        i += 1
    }

    if (touched) return out.join('\n')

    // Fallback: collect contiguous -/+ blocks without hunk headers.
    const removals = []
    const additions = []
    for (const row of lines) {
        if (row.startsWith('+') && ! row.startsWith('+++')) additions.push(row.slice(1))
        else if (row.startsWith('-') && ! row.startsWith('---')) removals.push(row.slice(1))
    }
    if (removals.length && existing.includes(removals.join('\n'))) {
        return existing.replace(removals.join('\n'), additions.join('\n'))
    }
    return null
}

function diffToSearchReplace(existing, diffText) {
    const lines = String(diffText || '').replace(/\r\n/g, '\n').split('\n')
    const removals = []
    const additions = []
    for (const row of lines) {
        if (row.startsWith('+') && ! row.startsWith('+++')) additions.push(row.slice(1))
        else if (row.startsWith('-') && ! row.startsWith('---')) removals.push(row.slice(1))
    }
    if (! removals.length) return null
    const search = removals.join('\n')
    if (! existing.includes(search)) return null
    return { search, replace: additions.join('\n') }
}

function extractProseWriteFences(raw, vfsContents) {
    const out = []
    // Wrote|Writing|Write|Updating|Updated|Modified|Fixed|Patched + path, then a fenced block
    const re = /\b(?:Wrote|Writing|Write|Updated?|Updating|Creating|Created|Modified|Fixed|Patched|Changed)\s+[`'"]?([^\s`'"]+?\.(?:jsx?|tsx?|css|html|json|md|svg))[`'"]?[^\n]*\n+```([^\n`]*)\n([\s\S]*?)```/giu
    let m
    while ((m = re.exec(raw))) {
        const pathHint = normalizeVfsPath(m[1]) || m[1]
        const meta = String(m[2] || '').trim()
        const body = String(m[3] || '').replace(/\n$/, '')
        if (! body.trim()) continue
        const metaPath = meta.split(/\s+/).find((part) => part.includes('/') || /\./.test(part))
        let path = normalizeVfsPath(metaPath || pathHint) || pathHint
        if (path && ! path.includes('/') && /\.(jsx?|tsx?|css|html)$/i.test(path)) {
            path = `src/${path}`
        }
        const call = fileBodyToToolCall(path, body, vfsContents)
        if (! call) continue
        out.push({
            call,
            start: m.index,
            end: m.index + m[0].length,
        })
    }
    return out
}

function extractStandaloneDiffs(raw, vfsContents) {
    const out = []
    // “Updated src/App.jsx” followed by a diff-looking block (no fence)
    const re = /\b(?:Updated?|Updating|Modified|Fixed|Patched|Changed)\s+[`'"]?([^\s`'"]+?\.(?:jsx?|tsx?|css|html|json|md|svg))[`'"]?[^\n]*\n+(?=diff --git |@@ |\+\+\+ |--- )([\s\S]*?)(?=\n\n[A-Z]|\n\n```|$)/giu
    let m
    while ((m = re.exec(raw))) {
        const path = normalizeVfsPath(m[1]) || m[1]
        const body = String(m[2] || '').trim()
        if (! looksLikeUnifiedDiff(body)) continue
        const call = fileBodyToToolCall(path, body, vfsContents)
        if (! call) continue
        out.push({
            call,
            start: m.index,
            end: m.index + m[0].length,
        })
    }
    return out
}

function extractJsonCandidates(raw) {
    const out = []
    const fenceRe = /```(?:json|tool[_-]?call|tools?)?\s*\n([\s\S]*?)```/giu
    let m
    while ((m = fenceRe.exec(raw))) {
        try {
            const value = JSON.parse(String(m[1] || '').trim())
            out.push({ value, start: m.index, end: m.index + m[0].length })
        } catch {
            /* skip */
        }
    }

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]
        if (ch !== '{' && ch !== '[') continue
        const sliced = sliceBalancedJson(raw, i)
        if (! sliced) continue
        const { json, end } = sliced
        if (! /"(?:name|tool|function)"\s*:/u.test(json)) {
            i = end
            continue
        }
        try {
            const value = JSON.parse(json)
            if (value && typeof value === 'object') {
                out.push({ value, start: i, end: end + 1 })
            }
        } catch {
            /* skip */
        }
        i = end
    }

    return out
}

function sliceBalancedJson(raw, start) {
    const open = raw[start]
    const close = open === '{' ? '}' : ']'
    let depth = 0
    let inString = false
    let escape = false

    for (let i = start; i < raw.length; i++) {
        const ch = raw[i]
        if (inString) {
            if (escape) {
                escape = false
                continue
            }
            if (ch === '\\') {
                escape = true
                continue
            }
            if (ch === '"') inString = false
            continue
        }
        if (ch === '"') {
            inString = true
            continue
        }
        if (ch === open) depth += 1
        else if (ch === close) {
            depth -= 1
            if (depth === 0) {
                return { json: raw.slice(start, i + 1), end: i }
            }
        }
    }
    return null
}

function toolCallsFromDecoded(decoded) {
    if (! decoded || typeof decoded !== 'object') return []
    if (Array.isArray(decoded)) {
        return decoded.map(toolCallFromRow).filter(Boolean)
    }
    if (Array.isArray(decoded.tool_calls)) {
        return toolCallsFromDecoded(decoded.tool_calls)
    }
    const single = toolCallFromRow(decoded)
    return single ? [single] : []
}

function toolCallFromRow(row) {
    if (! row || typeof row !== 'object') return null
    let name = String(
        row.name
        || row.tool
        || row.function?.name
        || (typeof row.function === 'string' ? row.function : '')
        || '',
    ).trim()
    if (name === 'patch_file' || name === 'apply_patch') name = 'write_file'
    if (! name || ! ALLOWED.has(name)) return null

    let args = row.arguments ?? row.parameters ?? row.input ?? row.function?.arguments ?? {}
    if (typeof args === 'string') {
        try {
            args = JSON.parse(args)
        } catch {
            args = {}
        }
    }
    if (! args || typeof args !== 'object' || Array.isArray(args)) args = {}

    // Legacy apply_patch payloads → write_file with best-effort full body.
    if (name === 'write_file' && ! Object.prototype.hasOwnProperty.call(args, 'content')) {
        const legacy = args.full_content ?? args.fullContent ?? args.replace ?? null
        if (legacy != null) {
            args = { ...args, content: String(legacy) }
        }
    }

    if (['write_file', 'read_file', 'list_dir'].includes(name)) {
        if (! String(args.path || '').trim()) return null
    }
    if (name === 'write_file' && ! Object.prototype.hasOwnProperty.call(args, 'content')) {
        return null
    }
    if (name === 'lookup_visuals' && ! String(args.query || '').trim()) {
        return null
    }
    if (name === 'revise_datastore' && ! String(args.sql || '').trim()) {
        return null
    }

    return {
        id: String(row.id || `pseudo_${Date.now().toString(36)}`),
        name,
        arguments: args,
    }
}

function extractXmlStyleCalls(raw, vfsContents) {
    const out = []
    const names = [...ALLOWED].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const re = new RegExp(`<(${names})>\\s*(?:<path>([^<]+)<\\/path>\\s*)?(?:<content>([\\s\\S]*?)<\\/content>\\s*)?<\\/\\1>`, 'giu')
    let m
    while ((m = re.exec(raw))) {
        const name = String(m[1] || '').trim()
        const path = String(m[2] || '').trim()
        const content = String(m[3] || '')
        if (! name) continue

        let call = null
        if (name === 'write_file') {
            call = fileBodyToToolCall(path, content, vfsContents)
        } else {
            const args = {}
            if (path) args.path = path
            if (content) args.content = content
            call = toolCallFromRow({ name, arguments: args })
        }
        if (! call) continue
        out.push({ call, start: m.index, end: m.index + m[0].length })
    }
    return out
}

function extractFunctionStyleCalls(raw) {
    const out = []
    const names = [...ALLOWED, 'patch_file', 'apply_patch'].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const re = new RegExp(`\\b(${names})\\s*\\(\\s*(\\{)`, 'gu')
    let m
    while ((m = re.exec(raw))) {
        const name = (m[1] === 'patch_file' || m[1] === 'apply_patch') ? 'write_file' : m[1]
        const braceIndex = m.index + m[0].length - 1
        const sliced = sliceBalancedJson(raw, braceIndex)
        if (! sliced) continue
        try {
            const args = JSON.parse(sliced.json)
            const call = toolCallFromRow({ name, arguments: args })
            if (! call) continue
            let end = sliced.end + 1
            while (end < raw.length && /\s/.test(raw[end])) end += 1
            if (raw[end] === ')') end += 1
            out.push({ call, start: m.index, end })
        } catch {
            /* skip */
        }
    }
    return out
}

function stripSpans(raw, spans) {
    if (! spans.length) return raw
    const sorted = [...spans].sort((a, b) => b[0] - a[0])
    let out = raw
    for (const [start, end] of sorted) {
        if (start < 0 || end <= start || end > out.length) continue
        out = out.slice(0, start) + out.slice(end)
    }
    return out
}
