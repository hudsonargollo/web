import { PINNED_REACT_VERSION, resolvePinnedReactPair, stripDepVersion } from './reactPin.js'

const BINARY_RE = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|mp4|webm|pdf|zip)$/i

export function normalizeVfsPath(input = '') {
    return String(input)
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/^\/+/, '')
        .replace(/\/+/g, '/')
        .replace(/\/\.$/, '')
        .replace(/\/$/, '')
}

/** Root config files Lab may persist (mirrors SiteWorkspace::isWritableRelative). */
const ROOT_WRITABLE = new Set([
    'index.html',
    'package.json',
    'vite.config.js',
    'vite.config.ts',
    'vite.config.mjs',
    'postcss.config.js',
    'postcss.config.cjs',
    'postcss.config.mjs',
    'tailwind.config.js',
    'tailwind.config.ts',
    'tailwind.config.cjs',
    'tailwind.config.mjs',
])

/**
 * Disk sandbox guard — reject clearly so the agent shifts strategy (no diff-loop).
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isWritableLabPath(path = '') {
    const relative = normalizeVfsPath(path)
    if (! relative) return false
    if (ROOT_WRITABLE.has(relative)) return true
    return relative === 'src'
        || relative === 'public'
        || relative.startsWith('src/')
        || relative.startsWith('public/')
}

export function resolveVfsPath(cwd, target = '') {
    const base = normalizeVfsPath(cwd)
    const raw = String(target || '').trim()

    if (! raw || raw === '.') return base

    const joined = raw.startsWith('/')
        ? normalizeVfsPath(raw)
        : normalizeVfsPath(base ? `${base}/${raw}` : raw)

    const parts = []
    for (const part of joined.split('/')) {
        if (! part || part === '.') continue
        if (part === '..') {
            parts.pop()
            continue
        }
        parts.push(part)
    }

    return parts.join('/')
}

/**
 * Relative import from one VFS file to another (`../shims/foo.js`).
 *
 * @param {string} fromFile
 * @param {string} toFile
 * @returns {string}
 */
export function relativeVfsImport(fromFile, toFile) {
    const from = normalizeVfsPath(fromFile)
    const to = normalizeVfsPath(toFile)
    const fromDir = from.includes('/') ? from.split('/').slice(0, -1) : []
    const toParts = to.split('/').filter(Boolean)
    let i = 0
    while (i < fromDir.length && i < toParts.length && fromDir[i] === toParts[i]) {
        i += 1
    }
    const ups = fromDir.length - i
    const down = toParts.slice(i)
    const rel = [...Array.from({ length: ups }, () => '..'), ...down].join('/')
    if (! rel) return './'
    return rel.startsWith('.') ? rel : `./${rel}`
}

export function isBinaryPath(path) {
    return BINARY_RE.test(normalizeVfsPath(path))
}

/** Flatten nested Files API tree → relative file paths. */
export function collectFilePaths(entries = [], out = []) {
    for (const entry of entries) {
        if (! entry) continue
        if (entry.type === 'folder') {
            collectFilePaths(entry.children || [], out)
            continue
        }
        if (entry.type === 'file' && entry.path) {
            out.push(normalizeVfsPath(entry.path))
        }
    }
    return out
}

/**
 * Next unused `src/untitled.tsx` / `src/untitled-2.tsx` path in this workspace.
 */
export function nextUntitledPath(contents = {}, tree = [], {
    dir = 'src',
    base = 'untitled',
    ext = 'tsx',
} = {}) {
    const used = new Set([
        ...Object.keys(contents || {}),
        ...collectFilePaths(tree),
    ].map((path) => normalizeVfsPath(path)).filter(Boolean))

    const first = normalizeVfsPath(`${dir}/${base}.${ext}`)
    if (first && ! used.has(first) && ! pathExists(contents, tree, first)) {
        return first
    }

    for (let n = 2; n < 1000; n += 1) {
        const candidate = normalizeVfsPath(`${dir}/${base}-${n}.${ext}`)
        if (candidate && ! used.has(candidate) && ! pathExists(contents, tree, candidate)) {
            return candidate
        }
    }

    return normalizeVfsPath(`${dir}/${base}-${Date.now().toString(36)}.${ext}`)
}

export function listDirectory(contents, tree, cwd = '', target = '.') {
    const dir = resolveVfsPath(cwd, target)
    const names = new Set()

    for (const path of Object.keys(contents || {})) {
        if (dir === '') {
            const top = path.split('/')[0]
            if (top) names.add(top)
            continue
        }
        if (path === dir) continue
        if (! path.startsWith(`${dir}/`)) continue
        const rest = path.slice(dir.length + 1)
        const top = rest.split('/')[0]
        if (top) names.add(top)
    }

    walkTreeForDir(tree || [], dir, names)

    return [...names].sort((a, b) => a.localeCompare(b))
}

function walkTreeForDir(entries, dir, names) {
    if (dir === '') {
        for (const entry of entries) {
            if (entry?.name) names.add(entry.name)
        }
        return
    }

    for (const entry of entries) {
        if (! entry) continue
        if (normalizeVfsPath(entry.path) === dir && entry.type === 'folder') {
            for (const child of entry.children || []) {
                if (child?.name) names.add(child.name)
            }
            return
        }
        if (entry.type === 'folder' && entry.children?.length) {
            walkTreeForDir(entry.children, dir, names)
        }
    }
}

export function pathExists(contents, tree, path) {
    const normalized = normalizeVfsPath(path)
    if (! normalized) return true
    if (Object.prototype.hasOwnProperty.call(contents || {}, normalized)) return true

    return treeHasPath(tree || [], normalized)
}

function treeHasPath(entries, path) {
    for (const entry of entries) {
        if (! entry?.path) continue
        if (normalizeVfsPath(entry.path) === path) return true
        if (entry.type === 'folder' && treeHasPath(entry.children || [], path)) return true
    }
    return false
}

/** Insert or update a file node in the nested tree (immutable). */
export function upsertFileInTree(entries = [], path, meta = {}) {
    const normalized = normalizeVfsPath(path)
    if (! normalized) return entries

    const parts = normalized.split('/')
    return upsertParts(entries, parts, '', normalized, meta)
}

function upsertParts(entries, parts, parentPath, fullPath, meta) {
    const [head, ...rest] = parts
    const list = entries.map((e) => ({ ...e, children: e.children ? [...e.children] : e.children }))
    const folderPath = parentPath ? `${parentPath}/${head}` : head

    if (rest.length === 0) {
        const idx = list.findIndex((e) => e.name === head && e.type === 'file')
        const node = {
            id: meta.id || `file-${fullPath}`,
            type: 'file',
            name: head,
            path: fullPath,
            kind: meta.kind || kindForName(head),
            sizeLabel: meta.sizeLabel || '0 B',
            modifiedLabel: meta.modifiedLabel || 'Just now',
            yours: true,
        }
        if (idx >= 0) list[idx] = { ...list[idx], ...node }
        else list.push(node)
        return sortTreeNodes(list)
    }

    let folderIdx = list.findIndex((e) => e.name === head && e.type === 'folder')

    if (folderIdx < 0) {
        list.push({
            id: `dir-${folderPath}`,
            type: 'folder',
            name: head,
            path: folderPath,
            modifiedLabel: 'Just now',
            children: [],
        })
        folderIdx = list.length - 1
    }

    const folder = list[folderIdx]
    list[folderIdx] = {
        ...folder,
        children: upsertParts(folder.children || [], rest, folderPath, fullPath, meta),
    }

    return sortTreeNodes(list)
}

/** Remove a file or folder from the nested tree (immutable). */
export function removePathFromTree(entries = [], path) {
    const normalized = normalizeVfsPath(path)
    if (! normalized) return entries

    return pruneTree(entries, normalized)
}

function pruneTree(entries, path) {
    const next = []
    for (const entry of entries) {
        const entryPath = normalizeVfsPath(entry.path)
        if (entryPath === path) continue
        if (entry.type === 'folder') {
            next.push({
                ...entry,
                children: pruneTree(entry.children || [], path),
            })
            continue
        }
        if (entryPath.startsWith(`${path}/`)) continue
        next.push(entry)
    }
    return next
}

function sortTreeNodes(nodes) {
    return [...nodes].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name)
    })
}

function kindForName(name) {
    const lower = String(name).toLowerCase()
    if (lower.endsWith('.md') || lower.endsWith('.mdx')) return 'markdown'
    if (/\.(png|jpe?g|gif|webp|svg)$/.test(lower)) return 'image'
    return 'code'
}

export function addDependencyToPackageJson(raw, packageName, version = 'latest') {
    let pkg
    try {
        pkg = JSON.parse(raw || '{}')
    } catch {
        pkg = {}
    }

    if (! pkg.dependencies || typeof pkg.dependencies !== 'object') {
        pkg.dependencies = {}
    }

    // React / react-dom always land as a matching locked pair (never diverge).
    if (packageName === 'react' || packageName === 'react-dom') {
        const pin = version && version !== 'latest'
            ? stripDepVersion(version)
            : PINNED_REACT_VERSION
        pkg.dependencies.react = pin || PINNED_REACT_VERSION
        pkg.dependencies['react-dom'] = pin || PINNED_REACT_VERSION
    } else {
        pkg.dependencies[packageName] = version
        const pair = resolvePinnedReactPair(pkg.dependencies)
        pkg.dependencies.react = pair.react
        pkg.dependencies['react-dom'] = pair.reactDom
    }

    return `${JSON.stringify(pkg, null, 2)}\n`
}

export function parseDependenciesFromPackageJson(raw) {
    try {
        const pkg = JSON.parse(raw || '{}')
        const deps = pkg.dependencies && typeof pkg.dependencies === 'object'
            ? { ...pkg.dependencies }
            : {}
        return deps
    } catch {
        return {}
    }
}

export function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
}
