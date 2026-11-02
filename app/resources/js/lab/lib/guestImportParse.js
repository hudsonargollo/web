function normalizeVfsPath(input = '') {
    return String(input)
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/^\/+/, '')
        .replace(/\/+/g, '/')
        .replace(/\/\.$/, '')
        .replace(/\/$/, '')
}

const UNRESOLVED_IMPORT_RE = /Failed to resolve import\s+"([^"]+)"\s+from\s+"([^"]+)"/i

/** @param {string} message */
export function parseUnresolvedImport(message = '') {
    const match = String(message || '').match(UNRESOLVED_IMPORT_RE)
    if (! match) return null
    return { spec: match[1], from: normalizeVfsPath(match[2]) }
}

/**
 * @param {string} fromFile e.g. src/App.jsx
 * @param {string} spec e.g. ./components/Header
 * @returns {string[]}
 */
export function resolveImportCandidatePaths(fromFile, spec) {
    const raw = String(spec || '').trim()
    if (! raw.startsWith('.')) return []

    const fromDir = normalizeVfsPath(fromFile).replace(/\/[^/]+$/, '')
    const relative = raw.replace(/^\.\//, '')
    const joined = normalizeVfsPath(fromDir ? `${fromDir}/${relative}` : relative)
    const exts = ['', '.jsx', '.js', '.tsx', '.ts', '.mjs', '.cjs']
    /** @type {string[]} */
    const out = []
    for (const ext of exts) {
        out.push(normalizeVfsPath(`${joined}${ext}`))
    }
    for (const ext of ['.jsx', '.js', '.tsx', '.ts']) {
        out.push(normalizeVfsPath(`${joined}/index${ext}`))
    }
    return [...new Set(out.filter(Boolean))]
}
