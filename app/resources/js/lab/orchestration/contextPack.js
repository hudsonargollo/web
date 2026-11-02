import { LANES } from './constants.js'
import { collectFilePaths, normalizeVfsPath } from '../lib/vfs.js'

/**
 * Layered context pack — never dumps full VFS into the model.
 */

export function buildSessionStub({
    sessionMode = 'planning',
    projectTitle = null,
    activePath = null,
    stackHint = 'React + Vite + Tailwind (Lab site-kit ui primitives; react/react-dom locked to 19.1.1)',
} = {}) {
    return {
        sessionMode,
        projectTitle: projectTitle || null,
        activePath: activePath ? normalizeVfsPath(activePath) : null,
        stackHint,
        reactPin: '19.1.1',
    }
}

export function buildVfsManifest({ tree = [], contents = {} } = {}) {
    const paths = new Set([
        ...collectFilePaths(tree),
        ...Object.keys(contents || {}),
    ].map(normalizeVfsPath).filter(Boolean))

    return [...paths].sort().map((path) => {
        const body = Object.prototype.hasOwnProperty.call(contents, path)
            ? String(contents[path] ?? '')
            : null
        return {
            path,
            bytes: body == null ? null : body.length,
        }
    })
}

export function buildHotFiles(contents = {}, paths = [], { maxChars = 8_000 } = {}) {
    const out = []
    for (const raw of paths) {
        const path = normalizeVfsPath(raw)
        if (! path || ! Object.prototype.hasOwnProperty.call(contents, path)) continue
        let body = String(contents[path] ?? '')
        let truncated = false
        if (body.length > maxChars) {
            body = body.slice(0, maxChars)
            truncated = true
        }
        out.push({ path, content: body, truncated })
    }
    return out
}

export function buildConversationWindow(messages = [], { keep = 6 } = {}) {
    const rows = Array.isArray(messages) ? messages : []
    if (rows.length <= keep) {
        return { recent: rows, summary: null }
    }
    const older = rows.slice(0, -keep)
    const recent = rows.slice(-keep)
    const summary = summarizeOlderTurns(older)
    return { recent, summary }
}

function summarizeOlderTurns(rows = []) {
    const decisions = []
    for (const row of rows) {
        const text = String(row?.content || '').replace(/\s+/g, ' ').trim()
        if (! text) continue
        decisions.push(`${row.role}: ${text.slice(0, 80)}`)
    }
    return decisions.slice(-6).join(' · ')
}

/**
 * Assemble a pack for a specific lane / stage.
 */
export function packContext({
    lane = LANES.CHAT,
    sessionStub,
    tree = [],
    contents = {},
    messages = [],
    hotPaths = [],
    observations = [],
    diffLedger = [],
    safetyFlags = {},
} = {}) {
    const conversation = buildConversationWindow(messages)
    const base = {
        session: sessionStub,
        conversation,
        safetyFlags: { ...safetyFlags },
    }

    if (lane === LANES.CHAT || lane === LANES.CLARIFY) {
        return {
            ...base,
            manifest: safetyFlags.workspaceOpen ? buildVfsManifest({ tree, contents }) : null,
            hotFiles: [],
            observations: [],
            diffLedger: [],
        }
    }

    return {
        ...base,
        manifest: buildVfsManifest({ tree, contents }),
        hotFiles: buildHotFiles(contents, hotPaths),
        observations: (observations || []).slice(-4).map(compactObservation),
        diffLedger: (diffLedger || []).map((row) => ({
            path: row.path,
            created: Boolean(row.created),
            beforeBytes: row.before == null ? 0 : String(row.before).length,
            afterBytes: row.after == null ? 0 : String(row.after).length,
        })),
    }
}

function compactObservation(obs) {
    return {
        status: obs.status,
        toolKind: obs.toolKind,
        summary: typeof obs.summary === 'string' ? obs.summary.slice(0, 400) : obs.summary,
        hint: obs.hint,
        errorClass: obs.errorClass,
        path: obs.artifacts?.path || null,
        writeModeApplied: obs.artifacts?.writeModeApplied || null,
        // Never ship full file previews in the stage pack — model can re-read.
        exactSnippet: typeof obs.artifacts?.exactSnippet === 'string'
            ? obs.artifacts.exactSnippet.slice(0, 800)
            : null,
        startLine: obs.artifacts?.startLine ?? null,
        endLine: obs.artifacts?.endLine ?? null,
        contextRefreshRequired: Boolean(obs.artifacts?.contextRefreshRequired),
    }
}
