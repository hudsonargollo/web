import { normalizeVfsPath, resolveVfsPath } from '../lib/vfs.js'
import { buildModuleStubSource, ensureBarePackagesInPackageJson, VFS_STUB_MARKER } from './vfsHeal.js'
import { syncPatchEngineBuffers } from './patchApply.js'
import { healExportMismatch } from '../lib/jsxExports.js'

const SOURCE_EXT = /\.(jsx?|tsx?|mjs|cjs)$/i
const RESOLVE_EXTS = ['.jsx', '.tsx', '.js', '.ts', '.mjs', '.cjs', '.css', '.json']

/**
 * Topology-aware dependency graph over a VFS snapshot.
 * Lightweight static analysis (comment/string-safe import extraction) —
 * no Babel/acorn dependency; mirrors esbuild relative resolve rules.
 */

/**
 * @typedef {{
 *   path: string,
 *   specifier: string,
 *   importer: string,
 *   names: { type: 'default'|'named'|'namespace'|'side-effect', imported: string|null, local: string|null }[],
 * }} DagEdge
 */

/**
 * @typedef {{
 *   missing: string[],
 *   unresolvedSymbols: { path: string, importer: string, symbol: string, kind: string }[],
 *   edges: DagEdge[],
 *   barePackages: string[],
 *   nodes: string[],
 * }} TopologyAnalysis
 */

/**
 * Strip line/block comments (preserve string literals — import paths live there).
 *
 * @param {string} source
 * @returns {string}
 */
export function stripJsComments(source = '') {
    let out = ''
    const text = String(source || '')
    let i = 0
    while (i < text.length) {
        const c = text[i]
        const n = text[i + 1]

        // Keep strings intact (specifiers are quoted).
        if (c === '"' || c === "'" || c === '`') {
            const quote = c
            out += c
            i += 1
            while (i < text.length) {
                out += text[i]
                if (text[i] === '\\') {
                    i += 1
                    if (i < text.length) {
                        out += text[i]
                        i += 1
                    }
                    continue
                }
                if (text[i] === quote) {
                    i += 1
                    break
                }
                i += 1
            }
            continue
        }

        if (c === '/' && n === '/') {
            out += '  '
            i += 2
            while (i < text.length && text[i] !== '\n') {
                out += ' '
                i += 1
            }
            continue
        }

        if (c === '/' && n === '*') {
            out += '  '
            i += 2
            while (i < text.length && ! (text[i] === '*' && text[i + 1] === '/')) {
                out += text[i] === '\n' ? '\n' : ' '
                i += 1
            }
            if (i < text.length) {
                out += '  '
                i += 2
            }
            continue
        }

        out += c
        i += 1
    }
    return out
}

/** @deprecated Use stripJsComments — kept as alias for call sites. */
export function stripJsNoise(source = '') {
    return stripJsComments(source)
}

/**
 * Parse ESM / CJS import bindings from a source file.
 *
 * @param {string} source
 * @returns {{
 *   specifier: string,
 *   names: { type: string, imported: string|null, local: string|null }[],
 *   dynamic: boolean,
 * }[]}
 */
export function extractImportBindings(source = '') {
    const safe = stripJsComments(source)
    /** @type {{ specifier: string, names: object[], dynamic: boolean }[]} */
    const out = []

    const push = (specifier, names, dynamic = false) => {
        const spec = String(specifier || '').trim()
        if (! spec) return
        out.push({
            specifier: spec,
            names: names?.length ? names : [{ type: 'side-effect', imported: null, local: null }],
            dynamic: Boolean(dynamic),
        })
    }

    // import … from 'x'  |  export … from 'x'
    const fromRe = /\b(?:import|export)\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
    let match
    while ((match = fromRe.exec(safe)) !== null) {
        const clause = String(match[1] || '').trim()
        const spec = match[2]
        push(spec, parseImportClause(clause), false)
    }

    // side-effect: import 'x'
    const sideRe = /\bimport\s+['"]([^'"]+)['"]\s*;?/g
    while ((match = sideRe.exec(safe)) !== null) {
        // Skip ones already captured as import-from (clause empty edge case).
        if (out.some((row) => row.specifier === match[1] && ! row.dynamic)) continue
        push(match[1], [{ type: 'side-effect', imported: null, local: null }], false)
    }

    // dynamic import('x') / import("x")
    const dynRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    while ((match = dynRe.exec(safe)) !== null) {
        push(match[1], [{ type: 'namespace', imported: '*', local: null }], true)
    }

    // require('x')
    const reqRe = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    while ((match = reqRe.exec(safe)) !== null) {
        push(match[1], [{ type: 'default', imported: 'default', local: null }], false)
    }

    return out
}

/**
 * @param {string} clause
 * @returns {{ type: string, imported: string|null, local: string|null }[]}
 */
function parseImportClause(clause = '') {
    const text = String(clause || '').trim()
    if (! text) return [{ type: 'side-effect', imported: null, local: null }]

    /** @type {{ type: string, imported: string|null, local: string|null }[]} */
    const names = []

    // namespace: * as Foo
    const ns = text.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)/)
    if (ns) {
        names.push({ type: 'namespace', imported: '*', local: ns[1] })
        return names
    }

    // default + optional named: Foo, { A, B as C }
    const defaultNamed = text.match(
        /^([A-Za-z_$][\w$]*)\s*(?:,\s*\{([^}]*)\})?$/,
    )
    if (defaultNamed && ! text.startsWith('{')) {
        names.push({ type: 'default', imported: 'default', local: defaultNamed[1] })
        if (defaultNamed[2] != null) {
            names.push(...parseNamedList(defaultNamed[2]))
        }
        return names
    }

    // named only: { A, B as C }
    const namedOnly = text.match(/^\{([^}]*)\}$/)
    if (namedOnly) {
        return parseNamedList(namedOnly[1])
    }

    // default-only identifier (already covered) — fallback treat as default
    if (/^[A-Za-z_$][\w$]*$/.test(text)) {
        names.push({ type: 'default', imported: 'default', local: text })
        return names
    }

    return [{ type: 'side-effect', imported: null, local: null }]
}

function parseNamedList(list = '') {
    return String(list || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const alias = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/)
            if (alias) {
                return { type: 'named', imported: alias[1], local: alias[2] }
            }
            const id = part.match(/^([A-Za-z_$][\w$]*)$/)
            if (id) {
                return { type: 'named', imported: id[1], local: id[1] }
            }
            return { type: 'named', imported: part, local: part }
        })
}

/**
 * Resolve a relative/absolute specifier against a VFS snapshot (esbuild-compatible).
 *
 * @param {Record<string, string>} snapshot
 * @param {string} importerPath
 * @param {string} specifier
 * @returns {{ hit: string|null, candidate: string, kind: 'relative'|'absolute'|'bare'|'url' }}
 */
export function resolveModuleInSnapshot(snapshot, importerPath, specifier) {
    const spec = String(specifier || '').trim()
    if (! spec) {
        return { hit: null, candidate: '', kind: 'bare' }
    }
    if (/^(https?:|data:|blob:)/i.test(spec)) {
        return { hit: null, candidate: spec, kind: 'url' }
    }
    if (! (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/'))) {
        return { hit: null, candidate: barePackageName(spec), kind: 'bare' }
    }

    const importerDir = importerPath.includes('/')
        ? importerPath.replace(/\/[^/]*$/, '')
        : ''
    const target = spec.startsWith('/')
        ? normalizeVfsPath(spec)
        : resolveVfsPath(importerDir, spec)

    const hit = resolveWithExtensions(snapshot, target)
    if (hit) {
        return { hit: hit.path, candidate: hit.path, kind: spec.startsWith('/') ? 'absolute' : 'relative' }
    }

    const candidate = inventCandidatePath(target)
    return {
        hit: null,
        candidate,
        kind: spec.startsWith('/') ? 'absolute' : 'relative',
    }
}

/**
 * Build a DAG of internal module edges reachable from roots (or all source files).
 *
 * @param {Record<string, string>} snapshot
 * @param {{ roots?: string[] }} [opts]
 * @returns {{ nodes: string[], edges: DagEdge[], barePackages: string[] }}
 */
export function buildDependencyDag(snapshot = {}, opts = {}) {
    const contents = snapshot && typeof snapshot === 'object' ? snapshot : {}
    const rootList = Array.isArray(opts.roots) && opts.roots.length
        ? opts.roots.map((p) => normalizeVfsPath(p)).filter(Boolean)
        : Object.keys(contents).filter((p) => SOURCE_EXT.test(p))

    /** @type {Set<string>} */
    const nodes = new Set()
    /** @type {DagEdge[]} */
    const edges = []
    /** @type {Set<string>} */
    const bare = new Set()
    /** @type {Set<string>} */
    const seen = new Set()
    /** @type {string[]} */
    const queue = []

    for (const root of rootList) {
        if (! root || seen.has(root)) continue
        if (! Object.prototype.hasOwnProperty.call(contents, root)) continue
        seen.add(root)
        queue.push(root)
        nodes.add(root)
    }

    while (queue.length) {
        const path = queue.shift()
        if (! path || ! SOURCE_EXT.test(path)) continue
        const body = String(contents[path] ?? '')
        const imports = extractImportBindings(body)

        for (const row of imports) {
            const resolved = resolveModuleInSnapshot(contents, path, row.specifier)
            if (resolved.kind === 'bare' && resolved.candidate) {
                bare.add(resolved.candidate)
                continue
            }
            if (resolved.kind === 'url') continue

            const edge = {
                path: resolved.hit || resolved.candidate,
                specifier: row.specifier,
                importer: path,
                names: row.names,
            }
            edges.push(edge)

            if (resolved.hit) {
                nodes.add(resolved.hit)
                if (! seen.has(resolved.hit) && SOURCE_EXT.test(resolved.hit)) {
                    seen.add(resolved.hit)
                    queue.push(resolved.hit)
                }
            } else if (resolved.candidate) {
                nodes.add(resolved.candidate)
            }
        }
    }

    return {
        nodes: [...nodes].sort(),
        edges,
        barePackages: [...bare].sort(),
    }
}

/**
 * Full topology analysis: missing files + missing export symbols.
 *
 * @param {Record<string, string>} snapshot
 * @param {{ roots?: string[] }} [opts]
 * @returns {TopologyAnalysis}
 */
export function analyzeWorkingTopology(snapshot = {}, opts = {}) {
    const dag = buildDependencyDag(snapshot, opts)
    /** @type {string[]} */
    const missing = []
    /** @type {Set<string>} */
    const missingSeen = new Set()
    /** @type {TopologyAnalysis['unresolvedSymbols']} */
    const unresolvedSymbols = []

    for (const edge of dag.edges) {
        const resolved = lookupExact(snapshot, edge.path)
            || resolveWithExtensions(snapshot, stripExt(edge.path))
            || resolveWithExtensions(snapshot, edge.path)

        if (! resolved) {
            const candidate = inventCandidatePath(edge.path)
            if (! missingSeen.has(candidate)) {
                missingSeen.add(candidate)
                missing.push(candidate)
            }
            continue
        }

        const resolvedPath = resolved.path
        const body = String(snapshot[resolvedPath] ?? '')
        const exports = extractExportSymbols(body)

        for (const name of edge.names || []) {
            if (name.type === 'side-effect' || name.type === 'namespace') continue
            if (name.type === 'default') {
                if (! exports.hasDefault) {
                    unresolvedSymbols.push({
                        path: resolvedPath,
                        importer: edge.importer,
                        symbol: 'default',
                        kind: 'default',
                    })
                }
                continue
            }
            if (name.type === 'named' && name.imported) {
                if (! exports.named.has(name.imported) && ! exports.hasExportStar) {
                    unresolvedSymbols.push({
                        path: resolvedPath,
                        importer: edge.importer,
                        symbol: name.imported,
                        kind: 'named',
                    })
                }
            }
        }
    }

    return {
        missing,
        unresolvedSymbols,
        edges: dag.edges,
        barePackages: dag.barePackages,
        nodes: dag.nodes,
    }
}

/**
 * True when the working tree still has unresolved internal imports.
 *
 * @param {TopologyAnalysis} analysis
 * @returns {boolean}
 */
export function topologyNeedsDrain(analysis) {
    if (! analysis) return false
    return (analysis.missing?.length || 0) > 0
        || (analysis.unresolvedSymbols?.length || 0) > 0
}

/**
 * Agent brief for pre-dry-probe topology drain (mandate write_file).
 *
 * @param {TopologyAnalysis} analysis
 * @param {{ attempt?: number, maxAttempts?: number }} [opts]
 * @returns {string}
 */
export function buildTopologyDrainBrief(analysis, opts = {}) {
    const attempt = opts.attempt || 1
    const maxAttempts = opts.maxAttempts || 3
    const missing = analysis?.missing || []
    const symbols = analysis?.unresolvedSymbols || []

    const parts = [
        `[topology-drain attempt ${attempt}/${maxAttempts}]`,
        'SYSTEM ERROR: Topology DAG found unresolved internal imports BEFORE dry-probe.',
        'Do NOT stop. Call write_file NOW for every missing module listed below.',
        'Use write_file with COMPLETE file contents only.',
    ]

    if (missing.length) {
        parts.push(`Missing modules (create each with COMPLETE source): ${missing.join(', ')}.`)
        parts.push(
            'Each file MUST export the symbol its importers expect (default export for `import X from …`, named exports for `{ X }`).',
        )
    }

    if (symbols.length) {
        const detail = symbols
            .slice(0, 12)
            .map((row) => `${row.path} missing export '${row.symbol}' (imported by ${row.importer})`)
            .join(' | ')
        parts.push(`Export mismatches: ${detail}.`)
        parts.push('Rewrite those files via write_file so the exported symbols match the import specifiers.')
    }

    return parts.join(' ')
}

/**
 * Soft UI marker while draining the DAG.
 * Painted as the clickable VfsHealBadge (not a plain OrchestrationCallout).
 *
 * @param {object[]} callouts
 * @param {TopologyAnalysis} analysis
 * @returns {number} unresolved count (0 when nothing to drain)
 */
export function pushTopologyDrainCallout(callouts, analysis) {
    const n = (analysis?.missing?.length || 0) + (analysis?.unresolvedSymbols?.length || 0)
    if (! n) return 0
    const text = n === 1
        ? 'Resolving 1 missing module before compile…'
        : `Resolving ${n} missing modules before compile…`
    const existing = callouts.find((row) => row?.kind === 'vfs-heal')
    if (existing) {
        existing.count = n
        existing.text = text
        existing.active = true
        return n
    }
    callouts.push({
        kind: 'vfs-heal',
        tone: 'info',
        text,
        count: n,
        active: true,
    })
    return n
}

/**
 * Absolute zero-fail fallback: stub every still-missing path + ensure bare CDN deps.
 *
 * @param {object} workingVfs
 * @param {TopologyAnalysis} analysis
 * @returns {{ stubs: string[], packages: string[] }}
 */
export function applyTopologyStubFallback(workingVfs, analysis) {
    /** @type {Map<string, { named: Set<string>, wantDefault: boolean }>} */
    const needs = new Map()

    const ensure = (path) => {
        const key = normalizeVfsPath(path)
        if (! key) return null
        if (! needs.has(key)) {
            needs.set(key, { named: new Set(), wantDefault: false })
        }
        return needs.get(key)
    }

    for (const path of analysis?.missing || []) {
        const slot = ensure(path)
        if (slot) slot.wantDefault = true
    }

    for (const edge of analysis?.edges || []) {
        const candidate = inventCandidatePath(edge.path)
        const resolvedMissing = (analysis?.missing || []).includes(candidate)
            || (analysis?.missing || []).includes(normalizeVfsPath(edge.path))
        if (! resolvedMissing && workingVfs.has(edge.path)) {
            // Existing file with symbol gaps — rewrite only if it is already a stub.
            const body = String(workingVfs.read(edge.path) || '')
            if (! body.includes(VFS_STUB_MARKER)) continue
        }
        const slot = ensure(resolvedMissing ? candidate : edge.path)
        if (! slot) continue
        for (const name of edge.names || []) {
            if (name.type === 'default') slot.wantDefault = true
            if (name.type === 'named' && name.imported) slot.named.add(name.imported)
            if (name.type === 'namespace' || name.type === 'side-effect') slot.wantDefault = true
        }
    }

    for (const row of analysis?.unresolvedSymbols || []) {
        const slot = ensure(row.path)
        if (! slot) continue
        if (row.kind === 'default' || row.symbol === 'default') slot.wantDefault = true
        else if (row.symbol) slot.named.add(row.symbol)
    }

    /** @type {string[]} */
    const stubs = []
    /** @type {string[]} */
    const exportHeals = []

    for (const row of analysis?.unresolvedSymbols || []) {
        const key = normalizeVfsPath(row.path)
        if (! key || ! workingVfs.has(key)) continue
        const existing = String(workingVfs.read(key) || '')
        if (! existing.trim() || existing.includes(VFS_STUB_MARKER)) continue
        const healed = healExportMismatch(existing, row)
        if (! healed.changed) continue
        workingVfs.write(key, healed.body)
        exportHeals.push(key)
    }

    for (const [key, slot] of needs) {
        const existing = workingVfs.has(key) ? String(workingVfs.read(key) || '') : ''
        if (existing.trim() && ! existing.includes(VFS_STUB_MARKER)) continue
        const source = buildModuleStubSource(key, {
            namedExports: [...slot.named],
            defaultExport: slot.wantDefault || slot.named.size === 0,
        })
        workingVfs.write(key, source)
        stubs.push(key)
    }

    const synced = [...new Set([...stubs, ...exportHeals])]
    if (synced.length) {
        syncPatchEngineBuffers(workingVfs, synced)
    }

    const pkg = ensureBarePackagesInPackageJson(workingVfs, analysis?.barePackages || [])
    return { stubs, packages: pkg.added, exportHeals }
}

/**
 * Analyze Working VFS rooted at pending writes (+ optional entry).
 *
 * @param {object} workingVfs
 * @param {{ entry?: string|null }} [opts]
 * @returns {TopologyAnalysis}
 */
export function analyzeWorkingVfsTopology(workingVfs, opts = {}) {
    const snapshot = workingVfs.snapshot()
    const pending = Object.keys(workingVfs.pendingWrites() || {})
    const roots = [...pending]
    if (opts.entry) roots.push(opts.entry)
    // Prefer pending + common entries so we catch App→child gaps.
    for (const candidate of ['src/main.jsx', 'src/main.tsx', 'src/App.jsx', 'src/App.tsx', 'src/index.jsx']) {
        if (Object.prototype.hasOwnProperty.call(snapshot, candidate)) {
            roots.push(candidate)
        }
    }
    return analyzeWorkingTopology(snapshot, { roots: [...new Set(roots)] })
}

function resolveWithExtensions(contents, path) {
    const direct = lookupExact(contents, path)
    if (direct) return direct

    const normalized = normalizeVfsPath(path)
    for (const ext of RESOLVE_EXTS) {
        const hit = lookupExact(contents, normalized + ext)
        if (hit) return hit
    }
    for (const ext of RESOLVE_EXTS) {
        const hit = lookupExact(contents, `${normalized}/index${ext}`)
        if (hit) return hit
    }
    return null
}

function lookupExact(contents, path) {
    const normalized = normalizeVfsPath(path)
    if (! normalized) return null
    if (Object.prototype.hasOwnProperty.call(contents, normalized)) {
        return { path: normalized, contents: contents[normalized] }
    }
    return null
}

function inventCandidatePath(target = '') {
    const normalized = normalizeVfsPath(target)
    if (! normalized) return 'src/Stub.jsx'
    if (/\.[a-zA-Z0-9]+$/.test(normalized)) return normalized
    return `${normalized}.jsx`
}

function stripExt(path = '') {
    const normalized = normalizeVfsPath(path)
    return normalized.replace(/\.[a-zA-Z0-9]+$/, '')
}

function barePackageName(specifier = '') {
    const value = String(specifier || '').trim()
    if (! value) return ''
    if (value.startsWith('@')) {
        const parts = value.split('/')
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value
    }
    return value.split('/')[0] || ''
}

/**
 * Collect exported symbols from a module body.
 *
 * @param {string} source
 * @returns {{ hasDefault: boolean, named: Set<string>, hasExportStar: boolean }}
 */
export function extractExportSymbols(source = '') {
    const safe = stripJsComments(source)
    const named = new Set()
    let hasDefault = false
    let hasExportStar = false

    if (/\bexport\s+default\b/.test(safe)) {
        hasDefault = true
    }

    // export { A, B as C }
    const listRe = /\bexport\s*\{([^}]+)\}/g
    let match
    while ((match = listRe.exec(safe)) !== null) {
        for (const part of String(match[1] || '').split(',')) {
            const trimmed = part.trim()
            if (! trimmed) continue
            const alias = trimmed.match(/^(?:type\s+)?([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/)
            if (alias) {
                named.add(alias[2])
                continue
            }
            const id = trimmed.match(/^(?:type\s+)?([A-Za-z_$][\w$]*)$/)
            if (id) named.add(id[1])
        }
    }

    // export function/const/class/let/var Name
    const declRe = /\bexport\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g
    while ((match = declRe.exec(safe)) !== null) {
        named.add(match[1])
    }

    // export * from '…' / export * as ns from
    if (/\bexport\s+\*(?:\s+as\s+[A-Za-z_$][\w$]*)?\s+from\b/.test(safe)) {
        hasExportStar = true
    }

    // Common React pattern: function Foo + export default Foo already covered.
    // Also treat `export { default }` style via listRe.

    return { hasDefault, named, hasExportStar }
}
