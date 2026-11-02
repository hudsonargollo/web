import { collectFilePaths, isBinaryPath, listDirectory, normalizeVfsPath } from './vfs.js'
import { fetchFileContent } from './files.js'
import { runVfsCommand } from './vfsShell.js'
import { isToolLogLabel } from './toolActivity.js'
import { pendingWriteMatchKey } from './labTurns.js'

/**
 * Lab chat tools against the in-memory VFS (+ disk fetch when needed).
 * No MagicFlow patterns — path/content ops only.
 */

export function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** Turn a user brief into a workspace search query. */
export function searchQueryFromBrief(brief = '') {
    const text = String(brief || '').trim()
    if (! text) return 'src/**/*.{jsx,js,css,html}'

    const tokens = text
        .toLowerCase()
        .replace(/[^a-z0-9./_*\-\s]+/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 3)
        .slice(0, 4)

    if (! tokens.length) return 'src/**/*.{jsx,js,css,html}'
    return tokens.join(' ')
}

function globToRegExp(glob) {
    const body = String(glob)
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '<<<DS>>>')
        .replace(/\*/g, '[^/]*')
        .replace(/<<<DS>>>/g, '.*')
        .replace(/\{([^}]+)\}/g, (_, alts) => `(${alts.split(',').map((a) => a.trim()).join('|')})`)
    return new RegExp(`^${body}$`, 'i')
}

function scorePath(path, tokens) {
    const lower = path.toLowerCase()
    let score = 0
    for (const token of tokens) {
        if (lower.includes(token)) score += token.length + (lower.endsWith(token) ? 4 : 0)
    }
    if (lower.includes('src/app.jsx')) score += 20
    if (lower.startsWith('src/')) score += 4
    return score
}

/**
 * Search the workspace tree / contents by glob or free-text tokens.
 * @returns {{ query: string, hits: Array<{ path: string }> }}
 */
export function searchWorkspaceFiles({
    tree = [],
    contents = {},
    query = '',
    limit = 14,
} = {}) {
    const q = String(query || '').trim() || 'src/**/*.{jsx,js,css,html}'
    const pathSet = new Set([
        ...collectFilePaths(tree),
        ...Object.keys(contents || {}),
    ].map(normalizeVfsPath).filter(Boolean))

    const paths = [...pathSet].filter((path) => ! isBinaryPath(path))
    const looksGlob = /[*?{}]/.test(q)
    let hits = []

    if (looksGlob) {
        const re = globToRegExp(q)
        hits = paths.filter((path) => re.test(path)).map((path) => ({ path }))
    } else {
        const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
        hits = paths
            .map((path) => {
                const pathScore = scorePath(path, tokens)
                let contentScore = 0
                const body = contents[path]
                if (body && tokens.length) {
                    const lower = String(body).toLowerCase()
                    for (const token of tokens) {
                        if (lower.includes(token)) contentScore += 2
                    }
                }
                return { path, score: pathScore + contentScore }
            })
            .filter((row) => row.score > 0)
            .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
            .map(({ path }) => ({ path }))

        // Fallback: show the scaffold surface when tokens miss everything.
        if (! hits.length) {
            const preferred = ['src/App.jsx', 'src/main.jsx', 'src/index.css', 'index.html', 'package.json']
            hits = preferred
                .filter((path) => pathSet.has(normalizeVfsPath(path)))
                .map((path) => ({ path }))
            if (! hits.length) {
                hits = paths.slice(0, limit).map((path) => ({ path }))
            }
        }
    }

    return { query: q, hits: hits.slice(0, limit) }
}

/**
 * Read a file from VFS, fetching from disk when missing.
 * Optional startLine/endLine (1-based, inclusive) for a short window.
 */
export async function readWorkspaceFile({
    path,
    contents = {},
    projectUuid = null,
    maxChars = 12_000,
    startLine = null,
    endLine = null,
    around = null,
    window = 18,
} = {}) {
    const normalized = normalizeVfsPath(path)
    if (! normalized) {
        return {
            path: '',
            content: '',
            full: '',
            truncated: false,
            lineCount: 0,
            startLine: null,
            endLine: null,
        }
    }

    let body = Object.prototype.hasOwnProperty.call(contents, normalized)
        ? String(contents[normalized] ?? '')
        : null

    if (body == null && projectUuid) {
        try {
            const payload = await fetchFileContent(projectUuid, normalized)
            body = payload.content ?? ''
        } catch {
            body = ''
        }
    }

    const full = body == null ? '' : String(body)
    const allLines = full === '' ? [] : full.split('\n')
    const lineCount = allLines.length

    let from = startLine
    let to = endLine

    if (around != null && (from == null || to == null)) {
        const needle = String(around).toLowerCase()
        const hit = allLines.findIndex((row) => row.toLowerCase().includes(needle))
        const center = hit >= 0 ? hit + 1 : 1
        from = Math.max(1, center - Math.floor(window / 2))
        to = Math.min(lineCount || 1, from + window - 1)
    }

    if (from != null || to != null) {
        const lo = Math.max(1, Number(from) || 1)
        const hi = Math.min(lineCount || 1, Number(to) || lo)
        const slice = allLines.slice(lo - 1, hi)
        return {
            path: normalized,
            content: slice.join('\n'),
            full,
            truncated: hi < lineCount || lo > 1,
            lineCount,
            startLine: lo,
            endLine: hi,
        }
    }

    const truncated = full.length > maxChars
    const content = truncated ? `${full.slice(0, maxChars)}\n…` : full

    return {
        path: normalized,
        content,
        full,
        truncated,
        lineCount,
        startLine: lineCount ? 1 : null,
        endLine: lineCount || null,
    }
}

/** Grep workspace contents — path + line + snippet. */
export function grepWorkspaceFiles({
    contents = {},
    pattern = '',
    limit = 24,
    pathPrefix = '',
} = {}) {
    const raw = String(pattern || '').trim()
    if (! raw) return { pattern: '', hits: [] }

    let re
    try {
        re = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    } catch {
        re = null
    }

    const prefix = normalizeVfsPath(pathPrefix)
    const hits = []
    const paths = Object.keys(contents || {})
        .map(normalizeVfsPath)
        .filter((path) => path && ! isBinaryPath(path))
        .filter((path) => ! prefix || path === prefix || path.startsWith(`${prefix}/`))
        .sort((a, b) => a.localeCompare(b))

    for (const path of paths) {
        const rows = String(contents[path] ?? '').split('\n')
        for (let i = 0; i < rows.length; i += 1) {
            const line = rows[i]
            const ok = re ? re.test(line) : line.toLowerCase().includes(raw.toLowerCase())
            if (! ok) continue
            hits.push({
                path,
                line: i + 1,
                text: line.trim().slice(0, 160),
            })
            if (hits.length >= limit) {
                return { pattern: raw, hits }
            }
        }
    }

    return { pattern: raw, hits }
}

/** List a directory — Files-tree language. */
export function listWorkspaceDir({
    contents = {},
    tree = [],
    path = 'src',
} = {}) {
    const dir = normalizeVfsPath(path || '')
    const names = listDirectory(contents, tree, '', dir || '.')
    const filePaths = new Set(collectFilePaths(tree))
    const items = names.map((name) => {
        const child = dir ? `${dir}/${name}` : name
        const isFile = Object.prototype.hasOwnProperty.call(contents, child)
            || filePaths.has(child)
        const asFolder = ! isFile && (
            Object.keys(contents).some((p) => p.startsWith(`${child}/`))
            || listDirectory(contents, tree, '', child).length > 0
        )
        return {
            name,
            path: child,
            type: asFolder ? 'folder' : 'file',
        }
    })

    return {
        path: dir || '.',
        items,
        count: items.length,
    }
}

/** Same-origin (or absolute) HTTP peek for Fetch tool. */
export async function fetchHttpResource(url, { maxChars = 1200 } = {}) {
    const target = String(url || '').trim()
    if (! target) {
        return { url: '', status: 0, ok: false, body: '', truncated: false }
    }

    try {
        const response = await fetch(target, {
            headers: { Accept: 'application/json, text/plain, */*' },
            credentials: 'same-origin',
        })
        const text = await response.text()
        const truncated = text.length > maxChars
        return {
            url: target,
            status: response.status,
            ok: response.ok,
            body: truncated ? `${text.slice(0, maxChars)}\n…` : text,
            truncated,
        }
    } catch (error) {
        return {
            url: target,
            status: 0,
            ok: false,
            body: error?.message || 'Request failed',
            truncated: false,
        }
    }
}

export async function runShellCommand(command, ctx = {}) {
    const result = await runVfsCommand(command, ctx)
    const max = 40
    const lines = result.lines.slice(-max)
    return {
        command: String(command || '').trim(),
        exitCode: result.exitCode,
        lines,
        truncated: result.lines.length > max,
        cwd: result.cwd,
    }
}

const WRITE_TOOLS = new Set(['write_file'])
const EXPLORE_TOOLS = new Set(['list_dir', 'file_search', 'grep', 'read_file'])

/**
 * Normalize LLM <todos> plan items into checklist rows.
 * @param {Array<{ id?: string|number, task?: string, label?: string }|string>} raw
 * @returns {Array<{ id: string, label: string, status: 'pending'|'active'|'done'|'error' }>}
 */
export function planTodosFromRaw(raw = []) {
    const list = Array.isArray(raw) ? raw : []
    const items = []
    const seenIds = new Set()
    const seenLabels = new Set()

    for (const row of list) {
        let id = ''
        let label = ''
        if (typeof row === 'string' || typeof row === 'number') {
            label = String(row)
            id = String(items.length + 1)
        } else if (row && typeof row === 'object') {
            label = String(row.task ?? row.label ?? row.text ?? '').trim()
            id = String(row.id ?? '').trim() || String(items.length + 1)
        }
        label = label.replace(/\s+/g, ' ').trim()
        if (! label) continue
        // Never promote raw tool-execution strings into the Checklist.
        if (isToolLogLabel(label)) continue
        if (label.length > 120) label = `${label.slice(0, 119).trimEnd()}…`
        const labelKey = label.toLowerCase()
        if (seenLabels.has(labelKey)) continue
        if (seenIds.has(id)) id = String(items.length + 1)
        seenIds.add(id)
        seenLabels.add(labelKey)
        items.push({ id, label, status: 'pending' })
        if (items.length >= 8) break
    }

    return items
}

/** Merge extra plan items without duplicating ids/labels. */
export function mergePlanTodos(existing = [], extra = []) {
    let next = [...existing]
    for (const item of planTodosFromRaw(extra)) {
        if (next.some((row) => row.id === item.id || row.label.toLowerCase() === item.label.toLowerCase())) {
            continue
        }
        next = [...next, item]
    }
    return next
}

function pathHints(path = '') {
    const normalized = String(path || '').replace(/\\/g, '/').trim()
    if (! normalized) return []
    const base = normalized.split('/').filter(Boolean).pop() || normalized
    const hints = [normalized.toLowerCase(), base.toLowerCase()]
    if (base.includes('.')) {
        hints.push(base.split('.').slice(0, -1).join('.').toLowerCase())
    }
    return [...new Set(hints.filter(Boolean))]
}

function looksLikeExploreTodo(label = '') {
    return /\b(inspect|scan|read|locate|find|explore|review|check|survey)\b/i.test(String(label))
}

function looksLikeWriteTodo(label = '') {
    return /\b(update|edit|patch|write|add|fix|wire|implement|change|meta|style|state|create|rename|remove|delete|polish)\b/i.test(String(label))
}

function scoreTodoForTool(item, { tool = '', path = '' } = {}) {
    if (! item || item.status === 'done' || item.status === 'error') return -1
    const label = String(item.label || '')
    // Explore tools may only touch explore-flavored plan rows (never burn a write outcome).
    if (EXPLORE_TOOLS.has(tool) && ! looksLikeExploreTodo(label)) return -1
    // Prefer write-flavored rows for mutations when competing with inspect rows.
    if (WRITE_TOOLS.has(tool) && looksLikeExploreTodo(label) && ! looksLikeWriteTodo(label)) {
        return -1
    }

    let score = 0
    const hints = pathHints(path)
    const lower = label.toLowerCase()
    for (const hint of hints) {
        if (hint.length >= 2 && lower.includes(hint)) {
            score += 10 + Math.min(hint.length, 24)
        }
    }
    if (WRITE_TOOLS.has(tool) && looksLikeWriteTodo(label)) score += 3
    if (EXPLORE_TOOLS.has(tool) && looksLikeExploreTodo(label)) score += 4
    if (item.status === 'active') score += 2
    if (item.status === 'pending') score += 1
    return score
}

/**
 * Pick the best checklist item for a tool event (path-aware).
 * Write tools may fall back to the first pending write-ish item; explore tools require
 * an explore-flavored match so reads/lists never burn through write-oriented plan rows.
 */
export function matchTodoForTool(todos = [], { tool = '', path = '' } = {}) {
    if (! todos.length) return null
    let best = null
    let bestScore = 0
    for (const item of todos) {
        const score = scoreTodoForTool(item, { tool, path })
        if (score > bestScore) {
            best = item
            bestScore = score
        }
    }
    if (best && bestScore >= 4) return best.id
    if (WRITE_TOOLS.has(tool)) {
        const firstPending = todos.find((item) => (
            item.status === 'pending' && ! looksLikeExploreTodo(item.label)
        )) || todos.find((item) => item.status === 'pending')
        if (firstPending) return firstPending.id
        const active = todos.find((item) => item.status === 'active')
        return active?.id || null
    }
    return null
}

export function setTodoStatus(todos = [], id, status = 'done', label = null) {
    return todos.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, status }
        if (label != null && String(label).trim() !== '') next.label = String(label)
        return next
    })
}

/**
 * pending → active for the matched item; prior active items become done when advancing.
 */
export function advanceTodosOnToolStart(todos = [], { tool = '', path = '' } = {}) {
    if (! todos.length) return todos
    const targetId = matchTodoForTool(todos, { tool, path })
    if (! targetId) return todos

    return todos.map((item) => {
        if (item.id === targetId) {
            return item.status === 'done' || item.status === 'error'
                ? item
                : { ...item, status: 'active' }
        }
        if (item.status === 'active') {
            return { ...item, status: 'done' }
        }
        return item
    })
}

/** Mark the matched active/pending item done or error when a tool finishes. */
export function advanceTodosOnToolDone(todos = [], { tool = '', path = '', ok = true } = {}) {
    if (! todos.length) return todos
    const open = todos.filter((item) => item.status === 'active' || item.status === 'pending')
    const targetId = matchTodoForTool(open, { tool, path })
    if (! targetId) return todos
    // Explore tools only close a row they already activated (path / inspect match).
    if (EXPLORE_TOOLS.has(tool)) {
        const row = todos.find((item) => item.id === targetId)
        if (row?.status !== 'active') return todos
    }
    return setTodoStatus(todos, targetId, ok ? 'done' : 'error')
}

/** Mark every non-error plan item completed at turn end. */
export function completeAllTodos(todos = []) {
    return todos.map((item) => (
        item.status === 'error' ? item : { ...item, status: 'done' }
    ))
}

/** @deprecated Reactive tool-log checklists are gone — use planTodosFromRaw. */
export function buildTodosFromToolCalls(_toolCalls = []) {
    return []
}

/** @deprecated */
export function toolNameToTodoId(_toolName = '') {
    return null
}

/** @deprecated */
export function buildTurnTodos(_brief = '') {
    return []
}

export function observationSucceeded(observation) {
    const status = observation?.status
    return status === 'ok' || status === 'fallback_applied'
}

export function countDiffMeta(rows = []) {
    let added = 0
    let removed = 0
    for (const row of rows) {
        if (row.type === 'add') added += 1
        else if (row.type === 'del') removed += 1
    }
    return { added, removed }
}

export function grepPatternFromBrief(brief = '') {
    const tokens = String(brief || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]+/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 4)
    return tokens[0] || 'Your site starts here'
}

/** Pick the best file to open after a search. */
export function pickReadPath(hits = [], fallback = 'src/App.jsx') {
    const paths = hits.map((hit) => normalizeVfsPath(hit?.path || hit)).filter(Boolean)
    if (paths.includes('src/App.jsx')) return 'src/App.jsx'
    const src = paths.find((path) => path.startsWith('src/') && /\.(jsx?|tsx?)$/i.test(path))
    if (src) return src
    return paths[0] || fallback
}

function escapeJsxText(value) {
    return String(value || '')
        .replace(/[{}<>&]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Light scaffold edit — rewrite the App.jsx hero from the user brief.
 * Real models can later emit full file bodies; this keeps Write functional today.
 */
export function draftAppFromBrief(source = '', brief = '') {
    const title = escapeJsxText(brief).slice(0, 72) || 'Your site starts here'
    const blurb = 'This scaffold is a React + Vite + Tailwind workspace. Lab tools now read and write the real project VFS under src/.'

    let next = String(source || '')
    if (! next.trim()) {
        return `export default function App() {
  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
        <p className="text-xs font-medium tracking-[0.2em] text-teal-600 uppercase">
          Krikkit Lab
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          ${title}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-600">
          ${blurb}
        </p>
      </div>
    </main>
  )
}
`
    }

    next = next.replace(
        /(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/i,
        `$1\n          ${title}\n        $3`,
    )

    if (! /<h1\b/i.test(String(source || ''))) {
        // Unknown shape — leave source untouched.
        return String(source || '')
    }

    next = next.replace(
        /(<p className="mt-4[^"]*"[^>]*>)([\s\S]*?)(<\/p>)/i,
        `$1\n          ${blurb}\n        $3`,
    )

    return next
}

/**
 * Extract ```path ...``` or ```lang path ...``` fenced file bodies from markdown.
 * @returns {Array<{ path: string, content: string }>}
 */
export function extractFileBlocks(markdown = '') {
    const text = String(markdown || '')
    const out = []
    const re = /```([^\n`]*)\n([\s\S]*?)```/g
    let match

    while ((match = re.exec(text)) !== null) {
        const meta = String(match[1] || '').trim()
        const body = String(match[2] || '').replace(/\n$/, '')
        if (! meta || ! body.trim()) continue

        const parts = meta.split(/\s+/).filter(Boolean)
        let path = parts.find((part) => part.includes('/') || /\.(jsx?|tsx?|css|html|json|md|svg)$/i.test(part))
        if (! path && parts.length === 1 && /\./.test(parts[0])) path = parts[0]
        if (! path) continue

        out.push({ path: normalizeVfsPath(path), content: body })
    }

    return out
}

/**
 * Compact line diff for WriteFileCard rows.
 * @returns {Array<{ type: 'ctx'|'add'|'del'|'gap', line?: number, text?: string, count?: number }>}
 */
export function buildDiffRows(before = '', after = '', { context = 2, collapse = 5 } = {}) {
    const a = String(before).split('\n')
    const b = String(after).split('\n')

    if (a.length === 1 && a[0] === '' && b.join('\n') === before) {
        return []
    }

    const n = a.length
    const m = b.length
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

    for (let i = n - 1; i >= 0; i -= 1) {
        for (let j = m - 1; j >= 0; j -= 1) {
            dp[i][j] = a[i] === b[j]
                ? dp[i + 1][j + 1] + 1
                : Math.max(dp[i + 1][j], dp[i][j + 1])
        }
    }

    const ops = []
    let i = 0
    let j = 0
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            ops.push({ type: 'eq', aLine: i + 1, bLine: j + 1, text: a[i] })
            i += 1
            j += 1
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            ops.push({ type: 'del', aLine: i + 1, text: a[i] })
            i += 1
        } else {
            ops.push({ type: 'add', bLine: j + 1, text: b[j] })
            j += 1
        }
    }
    while (i < n) {
        ops.push({ type: 'del', aLine: i + 1, text: a[i] })
        i += 1
    }
    while (j < m) {
        ops.push({ type: 'add', bLine: j + 1, text: b[j] })
        j += 1
    }

    const changed = ops.map((op, idx) => (op.type === 'eq' ? -1 : idx)).filter((idx) => idx >= 0)
    if (! changed.length) return []

    const keep = new Array(ops.length).fill(false)
    for (const idx of changed) {
        const from = Math.max(0, idx - context)
        const to = Math.min(ops.length - 1, idx + context)
        for (let k = from; k <= to; k += 1) keep[k] = true
    }

    const rows = []
    let gap = 0
    for (let idx = 0; idx < ops.length; idx += 1) {
        if (! keep[idx]) {
            gap += 1
            continue
        }
        if (gap >= collapse) {
            rows.push({ type: 'gap', count: gap })
        } else if (gap > 0) {
            for (let back = idx - gap; back < idx; back += 1) {
                const op = ops[back]
                rows.push({ type: 'ctx', line: op.bLine ?? op.aLine, text: op.text })
            }
        }
        gap = 0

        const op = ops[idx]
        if (op.type === 'eq') {
            rows.push({ type: 'ctx', line: op.bLine, text: op.text })
        } else if (op.type === 'del') {
            rows.push({ type: 'del', line: op.aLine, text: op.text })
        } else {
            rows.push({ type: 'add', line: op.bLine, text: op.text })
        }
    }
    if (gap >= collapse) {
        rows.push({ type: 'gap', count: gap })
    }

    return rows
}

/**
 * Pending tool chrome from a tool_calls batch — paint file names before
 * the first byte hits the VFS so Switch isn't stuck on "Starting build…".
 */
export function pendingToolCard(tool, args = {}, meta = {}) {
    const name = String(tool || '')
    const input = args && typeof args === 'object' ? args : {}
    const callId = String(meta.id || '')
    const path = input.path != null && String(input.path).trim() !== ''
        ? normalizeVfsPath(input.path)
        : ''

    if (name === 'write_file') {
        const matchKey = path || pendingWriteMatchKey(callId)
        const card = { path, status: 'writing', rows: [] }
        return {
            listKey: 'writes',
            singular: 'writeFile',
            card,
            stack: { kind: 'writeFile', matchKey, ...card },
        }
    }
    if (name === 'read_file') {
        if (! path) return null
        const card = { path, status: 'reading' }
        return {
            listKey: 'reads',
            singular: 'readFile',
            card,
            stack: { kind: 'readFile', matchKey: path, ...card },
        }
    }
    if (name === 'apply_patch') {
        if (! path) return null
        const card = { path, status: 'editing', rows: [] }
        return {
            listKey: 'edits',
            singular: 'editFile',
            card,
            stack: { kind: 'editFile', matchKey: path, ...card },
        }
    }
    if (name === 'list_dir') {
        const dir = path || 'src'
        const card = { path: dir, status: 'listing', items: [] }
        return {
            listKey: 'listDirs',
            singular: 'listDir',
            card,
            stack: { kind: 'listDir', matchKey: dir, ...card },
        }
    }
    if (name === 'file_search') {
        const query = String(input.query || '').trim()
        if (! query) return null
        const card = { query, path: query, status: 'searching', hits: [] }
        return {
            listKey: 'fileSearches',
            singular: 'fileSearch',
            card,
            stack: { kind: 'fileSearch', matchKey: query, ...card },
        }
    }
    if (name === 'grep') {
        const pattern = String(input.pattern || '').trim()
        if (! pattern) return null
        const card = { pattern, path: pattern, status: 'searching', hits: [] }
        return {
            listKey: 'greps',
            singular: 'grep',
            card,
            stack: { kind: 'grep', matchKey: pattern, ...card },
        }
    }
    if (name === 'lookup_visuals') {
        const query = String(input.query || '').trim()
        if (! query) return null
        const card = { query, status: 'searching', count: 0 }
        return {
            listKey: null,
            singular: null,
            card,
            stack: { kind: 'lookupVisuals', matchKey: 'lookup-visuals', ...card },
        }
    }
    if (name === 'survey_datastore') {
        const card = { status: 'surveying', tableCount: 0, tables: [], summary: '' }
        return {
            listKey: null,
            singular: null,
            card,
            stack: { kind: 'datastoreSurvey', matchKey: 'survey-pending', ...card },
        }
    }
    if (name === 'revise_datastore') {
        const card = { status: 'revising', statementCount: 0, destructive: false, summary: '' }
        return {
            listKey: null,
            singular: null,
            card,
            stack: { kind: 'datastoreRevision', matchKey: 'revise-pending', ...card },
        }
    }
    if (
        name === 'github_status'
        || name === 'github_compare'
        || name === 'github_push'
        || name === 'github_pull'
        || name === 'github_fork'
        || name === 'github_link'
        || name === 'github_create_repo'
    ) {
        const card = { tool: name, status: 'running', summary: '' }
        return {
            listKey: null,
            singular: null,
            card,
            stack: { kind: 'github', matchKey: name, ...card },
        }
    }
    return null
}

/**
 * @param {Array<{ name?: string, arguments?: object }>} toolCalls
 * @returns {{
 *   writes: object[],
 *   reads: object[],
 *   listDirs: object[],
 *   fileSearches: object[],
 *   greps: object[],
 *   edits: object[],
 *   toolStack: object[],
 * }}
 */
export function pendingChromeFromToolCalls(toolCalls = []) {
    const writes = []
    const reads = []
    const listDirs = []
    const fileSearches = []
    const greps = []
    const edits = []
    const toolStack = []
    const seen = new Set()
    const buckets = { writes, reads, listDirs, fileSearches, greps, edits }

    for (const call of Array.isArray(toolCalls) ? toolCalls : []) {
        const painted = pendingToolCard(call?.name, call?.arguments || {}, { id: call?.id })
        if (! painted) continue
        const key = `${painted.stack.kind}:${painted.stack.matchKey}`
        if (seen.has(key)) continue
        seen.add(key)
        if (painted.listKey && buckets[painted.listKey]) {
            buckets[painted.listKey].push(painted.card)
        }
        toolStack.push(painted.stack)
    }

    return { writes, reads, listDirs, fileSearches, greps, edits, toolStack }
}
