import { parseAutoRepairFromPrompt } from './labErrors.js'
import { stripPreviewEditPrompt } from './previewEditTargets.js'

export function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Pair stored role/content(+metadata) rows into Lab turn bubbles. */
export function emptyTurn(userText = '', autoRepair = null, editTargets = null) {
    return {
        id: uid(),
        user: {
            text: autoRepair ? '' : stripPreviewEditPrompt(userText || ''),
            files: [],
            autoRepair: autoRepair || null,
            editTargets: Array.isArray(editTargets) && editTargets.length ? editTargets : null,
        },
        bot: null,
        botFollowUp: null,
        skipDivider: false,
        thinking: null,
        todos: null,
        // Classic tool cards (Read / Patch / Write / …).
        // Singular = latest (compat); plural arrays = full turn history for chat.
        listDir: null,
        listDirs: [],
        fileSearch: null,
        fileSearches: [],
        grep: null,
        greps: [],
        readFile: null,
        reads: [],
        editFile: null,
        edits: [],
        shell: null,
        fetch: null,
        writeFile: null,
        writes: [],
        datastoreSurvey: null,
        datastoreSurveys: [],
        datastoreRevision: null,
        datastoreRevisions: [],
        /** Chronological tool cards for chat — render this, not type-grouped buckets. */
        toolStack: [],
        writeFilePostHeal: false,
        buildGate: null,
        callouts: null,
        vfsHeal: null,
        validationFailure: null,
        turnStatus: null,
        waitStartedAt: null,
        thoughtStartedAt: null,
        // Ephemeral discovery chips — never hydrated from DB / never in turnChromeMetadata.
        suggestions: null,
    }
}

/** Match key for a write_file card painted before `path` arrives in the JSON. */
export const PENDING_WRITE_KEY_PREFIX = 'write-pending:'

export function pendingWriteMatchKey(id = '') {
    const token = String(id || '').trim()
    return token ? `${PENDING_WRITE_KEY_PREFIX}${token}` : `${PENDING_WRITE_KEY_PREFIX}open`
}

export function isPendingWriteKey(key = '') {
    return String(key || '').startsWith(PENDING_WRITE_KEY_PREFIX)
}

function promotePendingWriteIndex(list, { kind = 'writeFile', matchKey = '', path = '' } = {}) {
    if (! Array.isArray(list) || list.length === 0) return -1
    const nextKey = String(matchKey || path || '')
    if (! nextKey || isPendingWriteKey(nextKey)) return -1
    return list.findIndex((row) => {
        if (! row || typeof row !== 'object') return false
        if (kind && row.kind && row.kind !== kind) return false
        const rowKey = String(row.matchKey ?? row.path ?? '')
        const rowPath = String(row.path || '').trim()
        return (isPendingWriteKey(rowKey) || rowPath === '')
            && String(row.status || '') === 'writing'
    })
}

/**
 * Upsert a tool card into a chronological list (same path replaces in place).
 * @param {array|null|undefined} list
 * @param {object|null} card
 * @param {{ key?: string }} [opts]
 */
export function upsertChromeCard(list, card, opts = {}) {
    if (! card || typeof card !== 'object') {
        return Array.isArray(list) ? list : []
    }
    const key = opts.key || 'path'
    const next = Array.isArray(list) ? [...list] : []
    const id = card[key] != null ? String(card[key]) : ''
    if (id !== '') {
        const idx = next.findIndex((row) => String(row?.[key] ?? '') === id)
        if (idx >= 0) {
            next[idx] = { ...next[idx], ...card }
            return next
        }
        if (key === 'path' && (card.status === 'writing' || Array.isArray(card.rows))) {
            const pendingIdx = promotePendingWriteIndex(next, {
                matchKey: card.matchKey || id,
                path: card.path || '',
            })
            if (pendingIdx >= 0) {
                next[pendingIdx] = { ...next[pendingIdx], ...card }
                return next
            }
        }
    }
    next.push(card)
    return next
}

/**
 * Append/update an entry on the chronological tool stack.
 * Same kind+matchKey stays in its original slot (order preserved).
 *
 * @param {array|null|undefined} stack
 * @param {{ kind: string, matchKey?: string } & object} entry
 */
export function upsertToolStack(stack, entry) {
    if (! entry || typeof entry !== 'object' || ! entry.kind) {
        return Array.isArray(stack) ? stack : []
    }
    const next = Array.isArray(stack) ? [...stack] : []
    const matchKey = entry.matchKey != null
        ? String(entry.matchKey)
        : (entry.path != null ? String(entry.path) : '')
    if (matchKey !== '') {
        const idx = next.findIndex((row) => (
            row?.kind === entry.kind
            && String(row.matchKey ?? row.path ?? '') === matchKey
        ))
        if (idx >= 0) {
            next[idx] = { ...next[idx], ...entry, matchKey }
            return next
        }
        if (entry.kind === 'writeFile') {
            const pendingIdx = promotePendingWriteIndex(next, {
                kind: 'writeFile',
                matchKey,
                path: entry.path || '',
            })
            if (pendingIdx >= 0) {
                next[pendingIdx] = { ...next[pendingIdx], ...entry, matchKey }
                return next
            }
        }
    }
    next.push({ ...entry, matchKey })
    return next
}

/** One lookup_visuals row per turn — cumulative photograph count. */
export function upsertLookupVisualsStack(stack, card) {
    if (! card || typeof card !== 'object') {
        return collapseLookupVisualsStack(Array.isArray(stack) ? stack : [])
    }

    const KEY = 'lookup-visuals'
    const rows = (Array.isArray(stack) ? stack : []).filter((row) => row?.kind !== 'lookupVisuals')
    const prev = (Array.isArray(stack) ? stack : []).find((row) => row?.kind === 'lookupVisuals')
    const prevCount = Number(prev?.count) || 0
    const incoming = Number(card.count) || 0
    const settled = card.status === 'done' || card.status === 'error'

    rows.push({
        kind: 'lookupVisuals',
        matchKey: KEY,
        status: card.status || prev?.status || 'done',
        count: settled ? prevCount + incoming : prevCount,
        query: card.query || prev?.query || '',
    })

    return rows
}

/** Merge duplicate lookup_visuals rows (legacy hydrate / pre-fix turns). */
export function collapseLookupVisualsStack(stack) {
    const rows = Array.isArray(stack) ? stack : []
    const lookups = rows.filter((row) => row?.kind === 'lookupVisuals')
    if (lookups.length <= 1) return rows

    const rest = rows.filter((row) => row?.kind !== 'lookupVisuals')
    const count = lookups.reduce((sum, row) => sum + (Number(row.count) || 0), 0)
    const last = lookups[lookups.length - 1]
    rest.push({
        kind: 'lookupVisuals',
        matchKey: 'lookup-visuals',
        status: last?.status || 'done',
        count,
        query: last?.query || lookups[0]?.query || '',
    })
    return rest
}

/**
 * Build a chronological toolStack from legacy singular/plural chrome (F5 hydrate).
 * Prefer stored toolStack when present.
 */
export function turnToolStack(turn) {
    if (! turn || typeof turn !== 'object') return []
    if (Array.isArray(turn.toolStack) && turn.toolStack.length) {
        return collapseLookupVisualsStack(turn.toolStack.filter((row) => row && row.kind))
    }

    // Legacy rebuild — type order only when stack was never persisted.
    /** @type {array} */
    const stack = []
    for (const row of turnListDirs(turn)) {
        stack.push({ kind: 'listDir', matchKey: row.path, ...row })
    }
    for (const row of turnFileSearches(turn)) {
        stack.push({
            kind: 'fileSearch',
            matchKey: row.query || row.path || '',
            ...row,
        })
    }
    for (const row of turnGreps(turn)) {
        stack.push({
            kind: 'grep',
            matchKey: row.pattern || row.path || '',
            ...row,
        })
    }
    for (const row of turnReads(turn)) {
        stack.push({ kind: 'readFile', matchKey: row.path, ...row })
    }
    for (const row of turnEdits(turn)) {
        stack.push({ kind: 'editFile', matchKey: row.path, ...row })
    }
    if (turn.shell?.command) {
        stack.push({ kind: 'shell', matchKey: turn.shell.command, ...turn.shell })
    }
    if (turn.fetch?.url) {
        stack.push({ kind: 'fetch', matchKey: turn.fetch.url, ...turn.fetch })
    }
    const surveys = Array.isArray(turn.datastoreSurveys) && turn.datastoreSurveys.length
        ? turn.datastoreSurveys
        : (turn.datastoreSurvey ? [turn.datastoreSurvey] : [])
    for (const [index, row] of surveys.entries()) {
        stack.push({ kind: 'datastoreSurvey', matchKey: row.path || `survey-${index}`, ...row })
    }
    const revisions = Array.isArray(turn.datastoreRevisions) && turn.datastoreRevisions.length
        ? turn.datastoreRevisions
        : (turn.datastoreRevision ? [turn.datastoreRevision] : [])
    for (const [index, row] of revisions.entries()) {
        stack.push({ kind: 'datastoreRevision', matchKey: row.path || `revise-${index}`, ...row })
    }
    const heal = turn.vfsHeal && turn.vfsHeal.status !== 'idle' ? turn.vfsHeal : null
    const writes = turnWrites(turn)
    if (heal) {
        const pre = Array.isArray(heal.preWrites) && heal.preWrites.length
            ? heal.preWrites
            : writes.filter((w) => ! w.postHeal)
        for (const row of pre) {
            stack.push({ kind: 'writeFile', matchKey: row.path, ...row })
        }
        stack.push({
            kind: 'vfsHeal',
            matchKey: 'vfs-heal',
            count: heal.count || 0,
            status: heal.status || 'done',
        })
        const post = writes.filter((w) => w.postHeal)
        for (const row of (post.length ? post : (turn.writeFilePostHeal ? writes.slice(pre.length) : []))) {
            stack.push({ kind: 'writeFile', matchKey: row.path, ...row })
        }
    } else {
        for (const row of writes) {
            stack.push({ kind: 'writeFile', matchKey: row.path, ...row })
        }
    }
    return stack
}

/** Normalize turn writes: prefer `writes[]`, fall back to singular `writeFile`. */
export function turnWrites(turn) {
    if (! turn || typeof turn !== 'object') return []
    if (Array.isArray(turn.writes) && turn.writes.length) {
        return turn.writes.filter((row) => row && row.path)
    }
    if (turn.writeFile?.path) return [turn.writeFile]
    return []
}

export function turnReads(turn) {
    if (! turn || typeof turn !== 'object') return []
    if (Array.isArray(turn.reads) && turn.reads.length) {
        return turn.reads.filter((row) => row && row.path)
    }
    if (turn.readFile?.path) return [turn.readFile]
    return []
}

export function turnEdits(turn) {
    if (! turn || typeof turn !== 'object') return []
    if (Array.isArray(turn.edits) && turn.edits.length) {
        return turn.edits.filter((row) => row && row.path)
    }
    if (turn.editFile?.path) return [turn.editFile]
    return []
}

export function turnListDirs(turn) {
    if (! turn || typeof turn !== 'object') return []
    if (Array.isArray(turn.listDirs) && turn.listDirs.length) return turn.listDirs
    if (turn.listDir) return [turn.listDir]
    return []
}

export function turnFileSearches(turn) {
    if (! turn || typeof turn !== 'object') return []
    if (Array.isArray(turn.fileSearches) && turn.fileSearches.length) return turn.fileSearches
    if (turn.fileSearch) return [turn.fileSearch]
    return []
}

export function turnGreps(turn) {
    if (! turn || typeof turn !== 'object') return []
    if (Array.isArray(turn.greps) && turn.greps.length) return turn.greps
    if (turn.grep) return [turn.grep]
    return []
}

/** Merge persisted assistant metadata into a live turn shape. */
export function applyMessageMeta(turn, meta) {
    if (! turn || ! meta || typeof meta !== 'object') return turn

    const next = { ...turn }
    const assign = (key, value) => {
        if (value !== undefined && value !== null) next[key] = value
    }

    // Retain prior thought when metadata omits or nulls thinking (tool-only PUT).
    if (meta.thinking !== undefined) {
        const merged = mergeThinkingChrome(turn.thinking, meta.thinking)
        if (merged !== undefined) next.thinking = merged
    }
    assign('todos', sanitizeTodosMeta(meta.todos ?? meta.checklist ?? null))
    assign('listDir', meta.listDir)
    assign('listDirs', Array.isArray(meta.listDirs) ? meta.listDirs : undefined)
    assign('fileSearch', meta.fileSearch)
    assign('fileSearches', Array.isArray(meta.fileSearches) ? meta.fileSearches : undefined)
    assign('grep', meta.grep)
    assign('greps', Array.isArray(meta.greps) ? meta.greps : undefined)
    assign('readFile', meta.readFile)
    assign('reads', Array.isArray(meta.reads) ? meta.reads : undefined)
    assign('editFile', meta.editFile)
    assign('edits', Array.isArray(meta.edits) ? meta.edits : undefined)
    assign('shell', meta.shell)
    assign('fetch', meta.fetch)
    assign('writeFile', meta.writeFile)
    assign('writes', Array.isArray(meta.writes) ? meta.writes : undefined)
    assign('datastoreSurvey', meta.datastoreSurvey)
    assign('datastoreSurveys', Array.isArray(meta.datastoreSurveys) ? meta.datastoreSurveys : undefined)
    assign('datastoreRevision', meta.datastoreRevision)
    assign('datastoreRevisions', Array.isArray(meta.datastoreRevisions) ? meta.datastoreRevisions : undefined)
    assign('toolStack', Array.isArray(meta.toolStack) ? meta.toolStack : undefined)
    assign('writeFilePostHeal', meta.writeFilePostHeal)
    assign('buildGate', meta.buildGate)
    assign('callouts', meta.callouts)
    assign('vfsHeal', meta.vfsHeal)
    assign('validationFailure', meta.validationFailure)
    assign('botFollowUp', meta.botFollowUp)
    if (typeof meta.skipDivider === 'boolean') next.skipDivider = meta.skipDivider
    if (typeof meta.turnStatus === 'string' && meta.turnStatus.trim() !== '') {
        next.turnStatus = meta.turnStatus.trim().slice(0, 80)
    }
    if (meta.waitStartedAt != null && meta.waitStartedAt !== '') {
        const started = typeof meta.waitStartedAt === 'number'
            ? meta.waitStartedAt
            : Date.parse(String(meta.waitStartedAt))
        if (Number.isFinite(started)) next.waitStartedAt = started
    }

    // Historic thinking must never stream after reload.
    if (next.thinking && typeof next.thinking === 'object') {
        const text = String(next.thinking.text || '').trim()
        next.thinking = text
            ? {
                ...next.thinking,
                status: 'done',
                text,
                durationSec: Number(next.thinking.durationSec) || 0,
            }
            : null
    }

    return next
}

function sanitizeTodosMeta(todos) {
    if (! todos || typeof todos !== 'object') return null
    const items = Array.isArray(todos.items) ? todos.items : []
    const safe = items.filter((item) => {
        const label = String(item?.label || item?.task || '').trim()
        if (! label) return false
        // Drop legacy reactive tool-log checklist rows.
        if (/^(Read|Write|Wrote|Patch|Scan|Grep|Locate)\b/i.test(label)) return false
        if (/^(list|search|grep|read|edit)$/i.test(String(item?.id || ''))) {
            if (/^(Read|Write|Wrote|Patch|Scan|Grep|Locate|Listed)\b/i.test(label)) return false
        }
        return true
    })
    if (! safe.length) return null
    return { ...todos, items: safe }
}

/** True when the turn painted checklist / quiet tool activity worth persisting. */
export function hasPaintedToolChrome(chrome) {
    if (! chrome || typeof chrome !== 'object') return false
    return Boolean(
        chrome.todos
        || chrome.listDir
        || (Array.isArray(chrome.listDirs) && chrome.listDirs.length)
        || chrome.fileSearch
        || (Array.isArray(chrome.fileSearches) && chrome.fileSearches.length)
        || chrome.grep
        || (Array.isArray(chrome.greps) && chrome.greps.length)
        || chrome.readFile
        || (Array.isArray(chrome.reads) && chrome.reads.length)
        || chrome.editFile
        || (Array.isArray(chrome.edits) && chrome.edits.length)
        || chrome.shell
        || chrome.fetch
        || chrome.writeFile
        || (Array.isArray(chrome.writes) && chrome.writes.length)
        || chrome.datastoreSurvey
        || (Array.isArray(chrome.datastoreSurveys) && chrome.datastoreSurveys.length)
        || chrome.datastoreRevision
        || (Array.isArray(chrome.datastoreRevisions) && chrome.datastoreRevisions.length)
        || (Array.isArray(chrome.toolStack) && chrome.toolStack.length)
        || chrome.vfsHeal,
    )
}

/** True when thinking text should survive F5. */
export function hasThinkingChrome(chrome) {
    if (! chrome || typeof chrome !== 'object') return false
    const thinking = chrome.thinking
    if (! thinking || typeof thinking !== 'object') return false
    return Boolean(String(thinking.text || '').trim())
}

/**
 * Merge thinking chrome so established thought text is never wiped by tool /
 * persist patches that omit or null the field.
 * Semantics: `next ?? prev` for the block; never regress non-empty text to ''.
 *
 * @param {object|null|undefined} prev
 * @param {object|null|undefined} next
 * @returns {object|null|undefined} undefined = leave caller key untouched
 */
export function mergeThinkingChrome(prev, next) {
    if (next === undefined) return undefined
    if (next === null) {
        // Refuse to nullify once we have durable thought text.
        return hasThinkingChrome({ thinking: prev }) ? prev : null
    }
    if (! next || typeof next !== 'object') {
        return hasThinkingChrome({ thinking: prev }) ? prev : null
    }

    const prevText = String(prev?.text || '').trim()
    const nextText = String(next.text || '').trim()
    const text = nextText || prevText
    if (! text) {
        return {
            status: next.status || prev?.status || 'streaming',
            text: '',
            durationSec: Number(next.durationSec ?? prev?.durationSec) || 0,
        }
    }

    return {
        status: next.status || prev?.status || 'done',
        text,
        durationSec: Number(
            next.status === 'done'
                ? (next.durationSec ?? prev?.durationSec)
                : (prev?.durationSec ?? next.durationSec),
        ) || 0,
    }
}

/**
 * Patch turn chrome without clobbering established thought on tool events.
 * Missing `thinking` on the patch keeps the previous value.
 *
 * @param {object} prev
 * @param {object} patch
 */
export function mergeTurnChrome(prev, patch) {
    const base = prev && typeof prev === 'object' ? prev : {}
    const fields = patch && typeof patch === 'object' ? patch : {}
    const next = { ...base, ...fields }

    if ('thinking' in fields) {
        const merged = mergeThinkingChrome(base.thinking, fields.thinking)
        if (merged === undefined) {
            next.thinking = base.thinking
        } else {
            next.thinking = merged
        }
    } else if (hasThinkingChrome(base)) {
        // Tool / status patches omit thinking — always retain prior thought.
        next.thinking = base.thinking
    }

    return next
}

/** True when a wait/status row should survive F5. */
export function hasWaitChrome(chrome) {
    if (! chrome || typeof chrome !== 'object') return false
    if (typeof chrome.turnStatus === 'string' && chrome.turnStatus.trim() !== '') return true
    const started = chrome.waitStartedAt
    if (started == null || started === '') return false
    return Number.isFinite(typeof started === 'number' ? started : Date.parse(String(started)))
}

const WAIT_FRESH_MS = 15 * 60 * 1000

function parseStamp(value) {
    if (value == null || value === '') return null
    if (typeof value === 'number' && Number.isFinite(value)) return value
    const parsed = Date.parse(String(value))
    return Number.isFinite(parsed) ? parsed : null
}

function isFreshWaitStamp(value, now = Date.now()) {
    const start = parseStamp(value)
    if (start == null) return false
    return now - start < WAIT_FRESH_MS
}

const OPEN_TOOL_STATUSES = new Set([
    'pending',
    'active',
    'running',
    'streaming',
    'thinking',
    'writing',
    'reading',
    'listing',
    'searching',
    'editing',
    'waiting',
])

/** Wait labels that are terminal-phase UI — never store them as in-progress chrome. */
const EPHEMERAL_WAIT = /^(Finishing|Summarizing|Stopping)/i

function isOpenToolStatus(status) {
    return OPEN_TOOL_STATUSES.has(String(status || '').trim().toLowerCase())
}

function settleCardStatus(card, terminal) {
    if (! card || typeof card !== 'object') return card
    if (! isOpenToolStatus(card.status)) return card
    return { ...card, status: terminal }
}

/**
 * Drop in-progress wait labels and close open tool/heal cards so a finished
 * (or aborted) turn cannot linger as dashboard Failed / Stuck chrome.
 *
 * @param {object} chrome
 * @param {{ failed?: boolean }} [options]
 */
export function settleTurnChrome(chrome, { failed = false } = {}) {
    if (! chrome || typeof chrome !== 'object') return chrome
    const terminal = failed ? 'error' : 'done'
    const next = { ...chrome, turnStatus: null, waitStartedAt: null }

    for (const key of [
        'listDir', 'fileSearch', 'grep', 'readFile', 'editFile',
        'shell', 'fetch', 'writeFile', 'datastoreSurvey', 'datastoreRevision',
    ]) {
        if (next[key]) next[key] = settleCardStatus(next[key], terminal)
    }

    for (const key of [
        'listDirs', 'fileSearches', 'greps', 'reads', 'edits', 'writes',
        'datastoreSurveys', 'datastoreRevisions', 'toolStack',
    ]) {
        if (Array.isArray(next[key])) {
            next[key] = next[key].map((row) => settleCardStatus(row, terminal))
        }
    }

    if (next.vfsHeal && isOpenToolStatus(next.vfsHeal.status)) {
        next.vfsHeal = { ...next.vfsHeal, status: 'done' }
    }

    if (next.thinking && isOpenToolStatus(next.thinking.status)) {
        next.thinking = { ...next.thinking, status: 'done' }
    }

    if (next.todos && isOpenToolStatus(next.todos.status)) {
        next.todos = { ...next.todos, status: failed ? 'error' : 'done' }
    }

    return next
}

/** Tool cards, thinking, wait status, or operational failure chrome — anything the turn-state endpoint should keep. */
export function shouldPersistTurnChrome(chrome) {
    if (! chrome || typeof chrome !== 'object') return false
    if (hasPaintedToolChrome(chrome) || hasThinkingChrome(chrome) || hasWaitChrome(chrome)) return true
    if (Array.isArray(chrome.callouts) && chrome.callouts.length) return true
    if (typeof chrome.turnStatus === 'string' && chrome.turnStatus.trim() !== '') return true
    if (chrome.validationFailure && (chrome.validationFailure.errorClass || chrome.validationFailure.errors?.length)) {
        return true
    }
    return false
}

/** Serialize turn chrome for DB metadata (thinking, tools, checklist). */
export function turnChromeMetadata(turn) {
    if (! turn) return {}

    const thinking = turn.thinking
        ? {
            status: 'done',
            text: String(turn.thinking.text || '').slice(0, 20_000),
            durationSec: Number(turn.thinking.durationSec) || 0,
        }
        : null

    // Cap diff rows so bootstrap JSON stays HTML-attribute safe.
    const slimDiffCard = (card) => {
        if (! card || typeof card !== 'object') return null
        const rows = Array.isArray(card.rows) ? card.rows.slice(0, 80) : []
        return { ...card, rows }
    }

    const slimDiffList = (cards) => {
        if (! Array.isArray(cards) || ! cards.length) return null
        return cards.slice(0, 40).map((card) => slimDiffCard(card)).filter(Boolean)
    }

    const slimReadList = (cards) => {
        if (! Array.isArray(cards) || ! cards.length) return null
        return cards.slice(0, 40).map((card) => {
            if (! card || typeof card !== 'object') return null
            return {
                path: card.path,
                status: card.status,
                content: String(card.content || '').slice(0, 4_000),
                lineCount: card.lineCount ?? null,
                startLine: card.startLine ?? null,
                endLine: card.endLine ?? null,
                truncated: Boolean(card.truncated),
            }
        }).filter(Boolean)
    }

    const raw = {
        thinking,
        todos: turn.todos || null,
        checklist: turn.todos || null,
        listDir: turn.listDir || null,
        listDirs: Array.isArray(turn.listDirs) && turn.listDirs.length
            ? turn.listDirs.slice(0, 40)
            : null,
        fileSearch: turn.fileSearch || null,
        fileSearches: Array.isArray(turn.fileSearches) && turn.fileSearches.length
            ? turn.fileSearches.slice(0, 40)
            : null,
        grep: turn.grep || null,
        greps: Array.isArray(turn.greps) && turn.greps.length
            ? turn.greps.slice(0, 40)
            : null,
        readFile: turn.readFile
            ? {
                path: turn.readFile.path,
                status: turn.readFile.status,
                content: String(turn.readFile.content || '').slice(0, 4_000),
                lineCount: turn.readFile.lineCount ?? null,
                startLine: turn.readFile.startLine ?? null,
                endLine: turn.readFile.endLine ?? null,
                truncated: Boolean(turn.readFile.truncated),
            }
            : null,
        reads: slimReadList(turn.reads),
        editFile: slimDiffCard(turn.editFile),
        edits: slimDiffList(turn.edits),
        shell: turn.shell || null,
        fetch: turn.fetch || null,
        writeFile: slimDiffCard(turn.writeFile),
        writes: slimDiffList(turn.writes),
        datastoreSurvey: turn.datastoreSurvey || null,
        datastoreSurveys: Array.isArray(turn.datastoreSurveys) && turn.datastoreSurveys.length
            ? turn.datastoreSurveys.slice(0, 12)
            : null,
        datastoreRevision: turn.datastoreRevision || null,
        datastoreRevisions: Array.isArray(turn.datastoreRevisions) && turn.datastoreRevisions.length
            ? turn.datastoreRevisions.slice(0, 12)
            : null,
        toolStack: Array.isArray(turn.toolStack) && turn.toolStack.length
            ? turn.toolStack.slice(0, 60).map((row) => {
                if (! row || typeof row !== 'object') return null
                if (row.kind === 'writeFile' || row.kind === 'editFile') {
                    return slimDiffCard(row)
                }
                if (row.kind === 'readFile') {
                    return {
                        ...row,
                        content: String(row.content || '').slice(0, 4_000),
                    }
                }
                return row
            }).filter(Boolean)
            : null,
        writeFilePostHeal: turn.writeFilePostHeal ? true : null,
        buildGate: turn.buildGate || null,
        callouts: turn.callouts || null,
        vfsHeal: turn.vfsHeal
            ? {
                count: Number(turn.vfsHeal.count) || 0,
                status: turn.vfsHeal.status || 'done',
                preWrite: slimDiffCard(turn.vfsHeal.preWrite),
                preWrites: slimDiffList(turn.vfsHeal.preWrites),
            }
            : null,
        validationFailure: turn.validationFailure
            ? {
                errorClass: String(turn.validationFailure.errorClass || ''),
                outcome: turn.validationFailure.outcome || null,
                errors: Array.isArray(turn.validationFailure.errors)
                    ? turn.validationFailure.errors.map((row) => String(row || '').slice(0, 2000)).slice(0, 12)
                    : [],
            }
            : null,
        botFollowUp: turn.botFollowUp || null,
        skipDivider: Boolean(turn.skipDivider) ? true : null,
        // Empty string clears a previously persisted wait (PUT merge skips null).
        turnStatus: persistableWaitLabel(turn.turnStatus),
        waitStartedAt: persistableWaitLabel(turn.turnStatus) && Number.isFinite(Number(turn.waitStartedAt))
            ? Number(turn.waitStartedAt)
            : '',
    }

    // Omit nulls so PUT merge never wipes prior chrome with an empty snapshot.
    // Keep empty strings — LabTurnStateController treats those as wait-key deletes.
    return Object.fromEntries(
        Object.entries(raw).filter(([, value]) => value !== null && value !== undefined),
    )
}

function persistableWaitLabel(value) {
    const label = String(value || '').trim()
    if (label === '' || EPHEMERAL_WAIT.test(label)) return ''
    return label.slice(0, 80)
}

/**
 * Hydrate Lab turns from bootstrap/history.
 * One assistant row → one turn. Consecutive assistants (Switch/build) do not
 * merge into the previous user turn — that is what stuck tools on a greeting.
 */
export function turnsFromMessages(messages = []) {
    const turns = []
    let pending = null

    const flush = () => {
        if (pending) {
            turns.push(pending)
            pending = null
        }
    }

    const hasUser = (turn) => Boolean(
        turn?.user?.autoRepair
        || turn?.user?.text?.trim()
        || turn?.user?.files?.length
        || turn?.user?.editTargets?.length,
    )

    for (const row of messages) {
        if (row.role === 'user') {
            flush()
            const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : null
            const autoRepair = meta?.autoRepair || parseAutoRepairFromPrompt(row.content || '')
            const editTargets = Array.isArray(meta?.previewEdits) ? meta.previewEdits : null
            pending = emptyTurn(autoRepair ? '' : (row.content || ''), autoRepair, editTargets)
            const created = parseStamp(row.created_at)
            if (created != null) pending.userCreatedAt = created
            continue
        }

        if (row.role !== 'assistant') continue

        const text = String(row.content || '').trim()
        const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : null
        if (! text && ! hasPaintedToolChrome(meta) && ! hasThinkingChrome(meta) && ! hasWaitChrome(meta)) {
            // Continuation rows are usage-only. If one billed after a pending gate, the build already ran.
            if (pending?.buildGate === 'pending' && Number(meta?.usage?.credits) > 0) {
                pending.buildGate = 'accepted'
            }
            continue
        }

        // Switch mints a separate chrome-carrier row. Fold it back under the
        // discovery user crest so F5 doesn't dock a user-less tools section.
        if (
            pending
            && hasUser(pending)
            && (pending.bot || hasPaintedToolChrome(pending) || hasThinkingChrome(pending))
            && hasPaintedToolChrome(meta)
            && ! hasPaintedToolChrome(pending)
        ) {
            if (text) {
                if (! pending.botFollowUp) pending.botFollowUp = text
                else pending.botFollowUp = `${pending.botFollowUp}\n\n${text}`
            }
            pending = applyMessageMeta(pending, meta)
            continue
        }

        // Already have an assistant on this turn → start a new one (empty user).
        if (pending && (pending.bot || hasPaintedToolChrome(pending) || hasThinkingChrome(pending))) {
            flush()
        }
        if (! pending) pending = emptyTurn('')

        if (text) pending.bot = text
        pending = applyMessageMeta(pending, meta)
    }

    flush()

    for (let i = 0; i < turns.length; i += 1) {
        if (turns[i].buildGate !== 'pending') continue
        const laterWrite = turns.slice(i + 1).some((turn) => (
            Boolean(turn.writeFile)
            || (Array.isArray(turn.writes) && turn.writes.length > 0)
        ))
        if (laterWrite) turns[i].buildGate = 'accepted'
    }

    const last = turns[turns.length - 1]
    if (
        last
        && hasUser(last)
        && ! last.bot
        && ! hasPaintedToolChrome(last)
        && ! hasThinkingChrome(last)
        && ! last.turnStatus
        && isFreshWaitStamp(last.userCreatedAt)
    ) {
        last.turnStatus = 'Waiting for model…'
        last.waitStartedAt = last.userCreatedAt
    }

    return turns
}
