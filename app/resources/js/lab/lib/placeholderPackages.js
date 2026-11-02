import { isUninstallableLabPackage } from './toolchainPins.js'
import { relativeVfsImport } from './vfs.js'

const SOURCE_EXT = /\.(jsx?|tsx?|mjs|cjs)$/i
const SHIM_DIR = 'src/shims'

/**
 * Rewrite unpublished npm imports to local VFS shims and emit those modules.
 *
 * @param {Record<string, string>} files
 * @param {{ extraPackages?: string[] }} [opts]
 * @returns {{ files: Record<string, string>, changed: boolean, shims: string[] }}
 */
export function shimUninstallableBareImports(files = {}, opts = {}) {
    const extra = [...(opts?.extraPackages || [])]
    const snapshot = files && typeof files === 'object' ? files : {}
    /** @type {Record<string, string>} */
    const next = { ...snapshot }

    /** @type {Map<string, { named: Set<string>, wantDefault: boolean, namespace: boolean, specifiers: Set<string> }>} */
    const byPkg = new Map()

    for (const [path, body] of Object.entries(snapshot)) {
        if (! SOURCE_EXT.test(path)) continue
        for (const row of extractBareImportRows(String(body || ''))) {
            const pkg = barePackageName(row.specifier)
            if (! pkg || ! isUninstallableLabPackage(pkg, extra)) continue
            let slot = byPkg.get(pkg)
            if (! slot) {
                slot = {
                    named: new Set(),
                    wantDefault: false,
                    namespace: false,
                    specifiers: new Set(),
                }
                byPkg.set(pkg, slot)
            }
            slot.specifiers.add(row.specifier)
            if (row.kind === 'default') slot.wantDefault = true
            else if (row.kind === 'namespace') slot.namespace = true
            else if (row.kind === 'named' && row.name) slot.named.add(row.name)
        }
    }

    if (! byPkg.size) {
        return { files: next, changed: false, shims: [] }
    }

    /** @type {string[]} */
    const shims = []
    /** @type {Map<string, string>} */
    const shimByPkg = new Map()
    for (const [pkg, slot] of byPkg) {
        const shimPath = `${SHIM_DIR}/${sanitizePackageFile(pkg)}.js`
        shimByPkg.set(pkg, shimPath)
        next[shimPath] = buildPlaceholderShimSource(pkg, slot)
        shims.push(shimPath)
    }

    for (const [path, body] of Object.entries(snapshot)) {
        if (! SOURCE_EXT.test(path)) continue
        let rewritten = String(body || '')
        for (const [pkg, slot] of byPkg) {
            const shimPath = shimByPkg.get(pkg)
            const rel = relativeVfsImport(path, shimPath)
            const specs = [...slot.specifiers].sort((a, b) => b.length - a.length)
            for (const spec of specs) {
                rewritten = replaceQuotedSpec(rewritten, spec, rel)
            }
        }
        if (rewritten !== body) next[path] = rewritten
    }

    const changed = shims.some((path) => snapshot[path] !== next[path])
        || Object.keys(next).some((path) => next[path] !== snapshot[path])
    return { files: next, changed, shims }
}

/**
 * Pull a package name out of a DeepThought / npm fetch error.
 *
 * @param {unknown} err
 * @returns {string}
 */
export function extractFailedNpmPackage(err) {
    const text = String(err?.message || err || '')
    const patterns = [
        /Failed to fetch package ["']([^"']+)["']/i,
        /Could not (?:find|fetch) package ["']([^"']+)["']/i,
        /404[^\n]*["'](@?[\w.-]+\/[\w.-]+|[\w.-]+)["']/i,
    ]
    for (const re of patterns) {
        const match = text.match(re)
        if (match?.[1]) {
            return decodeURIComponent(String(match[1]).replace(/%2f/gi, '/')).trim()
        }
    }
    return ''
}

function extractBareImportRows(source = '') {
    /** @type {{ specifier: string, kind: string, name: string }[]} */
    const rows = []
    const fromRe = /\b(?:import|export)\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
    let match
    while ((match = fromRe.exec(source)) !== null) {
        const clause = String(match[1] || '').trim()
        const spec = match[2]
        if (clause.startsWith('*')) {
            rows.push({ specifier: spec, kind: 'namespace', name: '' })
            continue
        }
        if (clause.startsWith('{')) {
            for (const name of namedFromClause(clause)) {
                rows.push({ specifier: spec, kind: 'named', name })
            }
            continue
        }
        rows.push({ specifier: spec, kind: 'default', name: '' })
        const named = clause.match(/\{([^}]*)\}/)
        if (named) {
            for (const name of namedFromClause(`{${named[1]}}`)) {
                rows.push({ specifier: spec, kind: 'named', name })
            }
        }
    }
    const sideRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/g
    while ((match = sideRe.exec(source)) !== null) {
        const spec = match[1] || match[2] || match[3]
        if (! spec) continue
        rows.push({ specifier: spec, kind: 'namespace', name: '' })
    }
    return rows
}

function namedFromClause(clause = '') {
    const inner = String(clause || '').replace(/^\{|\}$/g, '')
    return inner.split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const alias = part.match(/^[A-Za-z_$][\w$]*\s+as\s+([A-Za-z_$][\w$]*)$/)
            if (alias) return alias[1]
            const id = part.match(/^([A-Za-z_$][\w$]*)$/)
            return id ? id[1] : ''
        })
        .filter(Boolean)
}

function replaceQuotedSpec(source, spec, next) {
    if (! spec || spec === next) return source
    const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(['"])${escaped}\\1`, 'g')
    return source.replace(re, `$1${next}$1`)
}

function barePackageName(specifier = '') {
    const value = String(specifier || '').trim()
    if (! value || value.startsWith('.') || value.startsWith('/')) return ''
    if (/^(https?:|data:|blob:)/i.test(value)) return ''
    if (value.startsWith('@')) {
        const parts = value.split('/')
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value
    }
    return value.split('/')[0] || ''
}

function sanitizePackageFile(name = '') {
    return String(name || 'package')
        .replace(/^@/, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'package'
}

function buildPlaceholderShimSource(packageName, slot) {
    const named = [...(slot?.named || [])]
        .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name))
        .sort()
    const lines = [
        `/** Local stand-in for ${packageName} — not published to npm. */`,
        'function noop() { return null }',
    ]
    for (const name of named) {
        lines.push(`export function ${name}() { return null }`)
    }
    if (slot?.wantDefault || slot?.namespace || named.length === 0) {
        const keys = named.length ? `${named.join(', ')}, default: noop` : 'default: noop'
        lines.push(`const __mod = { ${keys} }`)
        lines.push('export default __mod')
    }
    return `${lines.join('\n')}\n`
}
