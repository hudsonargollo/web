import { shimUninstallableBareImports } from '../lib/placeholderPackages.js'
import { isUninstallableLabPackage, normalizeLabPackageJson } from '../lib/toolchainPins.js'
import { normalizeVfsPath, parseDependenciesFromPackageJson, resolveVfsPath } from '../lib/vfs.js'
import { extractMissingImportPath } from './validator.js'
import { MAX_SYSTEM_FIX_RETRIES } from './constants.js'
import { syncPatchEngineBuffers } from './patchApply.js'

/** Marker comment — agent / UI can detect temporary heal stubs. */
export const VFS_STUB_MARKER = '@krikkit-vfs-stub'

/**
 * Collect every missing relative/absolute VFS path from compile/static errors.
 *
 * @param {string[]|string} errors
 * @returns {string[]}
 */
export function extractAllMissingImportPaths(errors = []) {
    const blob = Array.isArray(errors)
        ? errors.map((row) => String(row || '')).join('\n')
        : String(errors || '')

    /** @type {string[]} */
    const found = []
    const seen = new Set()

    const push = (path) => {
        const key = normalizeVfsPath(path)
        if (! key || seen.has(key)) return
        seen.add(key)
        found.push(key)
    }

    const resolveRe = /Could not resolve ["']([^"']+)["'](?: from ["']([^"']+)["'])?/gi
    let match
    while ((match = resolveRe.exec(blob)) !== null) {
        const spec = String(match[1] || '').trim()
        const importer = String(match[2] || '').trim()
        if (! spec || isBarePackageSpec(spec)) continue
        const importerDir = importer.includes('/')
            ? importer.replace(/\/[^/]*$/, '')
            : ''
        let resolved = spec.startsWith('/')
            ? normalizeVfsPath(spec)
            : resolveVfsPath(importerDir, spec)
        if (! resolved) continue
        if (! /\.[a-zA-Z0-9]+$/.test(resolved)) {
            resolved = `${resolved}.jsx`
        }
        push(resolved)
    }

    const missingRe = /File missing in VFS:\s*(\S+)/gi
    while ((match = missingRe.exec(blob)) !== null) {
        push(match[1])
    }

    // Fallback: single-path helper (malformed import lines, etc.)
    if (! found.length) {
        const one = extractMissingImportPath(errors)
        if (one) push(one)
    }

    return found
}

/**
 * Bare package names referenced in resolve failures (rare — usually CDN-external).
 *
 * @param {string[]|string} errors
 * @returns {string[]}
 */
export function extractBarePackageNames(errors = []) {
    const blob = Array.isArray(errors)
        ? errors.map((row) => String(row || '')).join('\n')
        : String(errors || '')
    /** @type {string[]} */
    const names = []
    const seen = new Set()
    const resolveRe = /Could not resolve ["']([^"']+)["']/gi
    let match
    while ((match = resolveRe.exec(blob)) !== null) {
        const spec = String(match[1] || '').trim()
        if (! isBarePackageSpec(spec)) continue
        const name = barePackageName(spec)
        if (! name || seen.has(name)) continue
        seen.add(name)
        names.push(name)
    }
    return names
}

/**
 * Generate an in-memory fallback module for a missing VFS path.
 *
 * @param {string} path
 * @param {{
 *   namedExports?: string[],
 *   defaultExport?: boolean,
 * }} [opts]
 * @returns {string}
 */
export function buildModuleStubSource(path = '', opts = {}) {
    const normalized = normalizeVfsPath(path)
    const base = normalized.split('/').pop() || 'Stub'
    const stem = base.replace(/\.[^.]+$/, '') || 'Stub'
    const exportName = toExportIdentifier(stem)
    const lower = normalized.toLowerCase()
    const namedExports = [...new Set(
        (opts.namedExports || [])
            .map((name) => String(name || '').trim())
            .filter((name) => name && name !== 'default' && /^[A-Za-z_$][\w$]*$/.test(name)),
    )]
    const wantDefault = opts.defaultExport !== false

    if (lower.endsWith('.css')) {
        return `/* ${VFS_STUB_MARKER} temporary stylesheet for ${normalized} */\n`
    }

    if (lower.endsWith('.json')) {
        return `${JSON.stringify({ __krikkitStub: true, path: normalized }, null, 2)}\n`
    }

    if (lower.endsWith('.ts') && ! lower.endsWith('.tsx')) {
        const lines = [
            `/** ${VFS_STUB_MARKER} — temporary module; replace with a real implementation */`,
        ]
        const primaryNamed = namedExports[0] || exportName
        const componentName = namedExports.includes(exportName) ? exportName : primaryNamed
        if (namedExports.length || wantDefault) {
            lines.push(`function ${componentName}(_props?: Record<string, unknown>): null { return null }`)
            for (const name of namedExports) {
                if (name === componentName) {
                    lines.push(`export { ${componentName} };`)
                } else {
                    lines.push(`export function ${name}(_props?: Record<string, unknown>): null { return null }`)
                }
            }
            if (wantDefault) {
                lines.push(`export default ${componentName};`)
            }
        } else {
            lines.push(`export {};`)
        }
        lines.push('')
        return lines.join('\n')
    }

    const lines = []
    const primaryNamed = namedExports[0] || exportName
    const componentName = namedExports.includes(exportName) ? exportName : primaryNamed

    if (namedExports.length || wantDefault) {
        lines.push(`export function ${componentName}(props) {`)
        lines.push(`  return (`)
        lines.push(`    <section className="border-b border-line bg-canvas px-6 py-12 text-fg" {...props}>`)
        lines.push(`      <h1 className="font-display text-2xl font-semibold tracking-tight">${componentName}</h1>`)
        lines.push(`    </section>`)
        lines.push(`  )`)
        lines.push(`}`)
        for (const name of namedExports) {
            if (name === componentName) continue
            lines.push(`export function ${name}(props) {`)
            lines.push(`  return (`)
            lines.push(`    <section className="border-b border-line bg-canvas px-6 py-12 text-fg" {...props}>`)
            lines.push(`      <h1 className="font-display text-2xl font-semibold tracking-tight">${name}</h1>`)
            lines.push(`    </section>`)
            lines.push(`  )`)
            lines.push(`}`)
        }
        if (wantDefault) {
            lines.push(`export default ${componentName};`)
        }
    } else {
        lines.push(`export {};`)
    }
    lines.push('')
    return lines.join('\n')
}

/**
 * Write missing-import stubs into Working VFS (in-memory only).
 *
 * @param {object} workingVfs
 * @param {string[]|string} errors
 * @returns {{ wrote: string[], skipped: string[], paths: string[] }}
 */
export function applyMissingImportStubs(workingVfs, errors = []) {
    const paths = extractAllMissingImportPaths(errors)
    /** @type {string[]} */
    const wrote = []
    /** @type {string[]} */
    const skipped = []

    for (const path of paths) {
        if (! path) continue
        const existing = workingVfs.has(path) ? String(workingVfs.read(path) || '') : ''
        if (existing.trim() && ! existing.includes(VFS_STUB_MARKER)) {
            skipped.push(path)
            continue
        }
        workingVfs.write(path, buildModuleStubSource(path))
        wrote.push(path)
    }

    if (wrote.length) {
        syncPatchEngineBuffers(workingVfs, wrote)
    }

    return { wrote, skipped, paths }
}

/**
 * Persist stub sources produced by the esbuild auto-stub plugin into Working VFS.
 *
 * @param {object} workingVfs
 * @param {{ path: string, contents?: string }[]} stubs
 * @returns {string[]}
 */
export function persistProbeStubs(workingVfs, stubs = []) {
    /** @type {string[]} */
    const wrote = []
    for (const stub of stubs || []) {
        const path = normalizeVfsPath(stub?.path || '')
        if (! path) continue
        const body = stub.contents != null
            ? String(stub.contents)
            : buildModuleStubSource(path)
        const existing = workingVfs.has(path) ? String(workingVfs.read(path) || '') : ''
        if (existing.trim() && ! existing.includes(VFS_STUB_MARKER)) {
            continue
        }
        workingVfs.write(path, body)
        wrote.push(path)
    }
    if (wrote.length) {
        syncPatchEngineBuffers(workingVfs, wrote)
    }
    return wrote
}

/**
 * Rewrite unpublished npm imports to local shims on the working VFS.
 *
 * @param {object} workingVfs
 * @param {string[]} [extraPackages]
 * @returns {{ paths: string[], shims: string[] }}
 */
export function applyShimUninstallableBareImports(workingVfs, extraPackages = []) {
    const snapshot = workingVfs.snapshot()
    const { files, changed, shims } = shimUninstallableBareImports(snapshot, { extraPackages })
    if (! changed) return { paths: [], shims: shims || [] }
    /** @type {string[]} */
    const wrote = []
    for (const [path, body] of Object.entries(files)) {
        if (snapshot[path] === body) continue
        workingVfs.write(path, body)
        wrote.push(path)
    }
    if (wrote.length) {
        syncPatchEngineBuffers(workingVfs, wrote)
    }
    return { paths: wrote, shims: shims || [] }
}

/**
 * Ensure installable bare packages exist in package.json. Unpublished
 * placeholders are never added — their imports are rewritten to local shims.
 *
 * @param {object} workingVfs
 * @param {{ name?: string, specifier?: string }[]|string[]} packages
 * @returns {{ added: string[], packageJsonUpdated: boolean, shims: string[] }}
 */
export function ensureBarePackagesInPackageJson(workingVfs, packages = []) {
    /** @type {string[]} */
    const names = []
    const seen = new Set()
    for (const row of packages || []) {
        const name = typeof row === 'string'
            ? barePackageName(row)
            : barePackageName(row?.name || row?.specifier || '')
        if (! name || seen.has(name)) continue
        if (name === 'react' || name === 'react-dom') continue
        seen.add(name)
        names.push(name)
    }

    const raw = workingVfs.has('package.json')
        ? String(workingVfs.read('package.json') || '')
        : ''
    let pkg
    try {
        pkg = raw.trim() ? JSON.parse(raw) : {}
    } catch {
        pkg = {}
    }
    if (! pkg || typeof pkg !== 'object') pkg = {}
    if (! pkg.dependencies || typeof pkg.dependencies !== 'object') {
        pkg.dependencies = {}
    }

    /** @type {string[]} */
    const added = []
    const needsStrip = hasUninstallableDeps(pkg)
    for (const name of names) {
        if (isUninstallableLabPackage(name)) continue
        if (pkg.dependencies[name] || pkg.devDependencies?.[name]) continue
        pkg.dependencies[name] = 'latest'
        added.push(name)
    }

    const packageJsonUpdated = added.length > 0 || needsStrip
    if (packageJsonUpdated && (workingVfs.has('package.json') || added.length)) {
        if (added.length) {
            const existing = parseDependenciesFromPackageJson(raw)
            pkg.dependencies = { ...existing, ...pkg.dependencies }
        }
        workingVfs.write('package.json', normalizeLabPackageJson(JSON.stringify(pkg)).body)
        syncPatchEngineBuffers(workingVfs, ['package.json'])
    }

    const shimmed = applyShimUninstallableBareImports(workingVfs)
    return { added, packageJsonUpdated, shims: shimmed.shims }
}

function hasUninstallableDeps(pkg = {}) {
    for (const name of Object.keys(pkg.dependencies || {})) {
        if (isUninstallableLabPackage(name)) return true
    }
    for (const name of Object.keys(pkg.devDependencies || {})) {
        if (isUninstallableLabPackage(name)) return true
    }
    return false
}

/**
 * Internal system-fix prompt for the automated self-correction loop.
 *
 * @param {{
 *   errorClass?: string|null,
 *   errors?: string[],
 *   stubs?: string[],
 *   attempt?: number,
 *   maxAttempts?: number,
 * }} opts
 * @returns {string}
 */
export function buildSystemFixPrompt(opts = {}) {
    const {
        errorClass = 'CompileFailed',
        errors = [],
        stubs = [],
        attempt = 1,
        maxAttempts = MAX_SYSTEM_FIX_RETRIES,
    } = opts

    const detail = (errors || [])
        .map((row) => String(row || '').trim())
        .filter(Boolean)
        .slice(0, 8)
    const missing = extractAllMissingImportPaths(errors)
    const stubList = [...new Set([...(stubs || []), ...missing])].filter(Boolean).slice(0, 12)

    const parts = [
        `[system-fix attempt ${attempt}/${maxAttempts}]`,
        'SYSTEM FIX: Dry-probe compilation failed. Do not explain — repair the Working VFS now.',
        `Error class: ${errorClass}.`,
    ]

    if (detail.length) {
        parts.push(`Compile diagnostics: ${detail.join(' | ')}`)
    }

    if (stubList.length) {
        parts.push(
            `Missing or stubbed modules (replace stubs with real implementations via write_file): ${stubList.join(', ')}.`,
        )
    }

    parts.push(
        'Call write_file with COMPLETE file contents for every broken or missing module.',
        'Use write_file only. Fix imports, create components, and clear syntax errors.',
    )

    return parts.join(' ')
}

/**
 * User-facing callout — never expose raw Rollback / MissingImport stacks.
 * Painted via VfsHealBadge (kind vfs-heal), not OrchestrationCallout.
 *
 * @param {object[]} callouts
 * @param {{ stubs?: string[], healed?: boolean }} [info]
 */
export function pushHealCallout(callouts, info = {}) {
    const stubs = info.stubs || []
    const count = stubs.length || 1
    const text = stubs.length
        ? `Resolving ${stubs.length} missing module${stubs.length === 1 ? '' : 's'} before compile…`
        : 'Resolving missing modules before compile…'
    const existing = callouts.find((row) => row?.kind === 'vfs-heal')
    if (existing) {
        existing.count = Math.max(Number(existing.count) || 0, count)
        existing.text = text
        existing.active = true
        return
    }
    callouts.push({
        kind: 'vfs-heal',
        tone: 'info',
        text,
        count,
        active: true,
    })
}

function toExportIdentifier(stem = 'Stub') {
    const cleaned = String(stem || 'Stub').replace(/[^a-zA-Z0-9_$]/g, '_')
    const named = cleaned.replace(/(?:^|[_-]+)([a-zA-Z0-9])/g, (_, c) => String(c).toUpperCase())
    const id = named.replace(/^[^a-zA-Z_$]+/, '') || 'Stub'
    if (/^[0-9]/.test(id)) return `Stub${id}`
    return id
}

function isBarePackageSpec(spec = '') {
    const value = String(spec || '').trim()
    if (! value) return true
    if (value.startsWith('.') || value.startsWith('/')) return false
    return true
}

function barePackageName(specifier = '') {
    const value = String(specifier || '').trim()
    if (! value || ! isBarePackageSpec(value)) return ''
    if (value.startsWith('@')) {
        const parts = value.split('/')
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value
    }
    return value.split('/')[0] || ''
}
