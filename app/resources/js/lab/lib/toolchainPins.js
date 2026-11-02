import { resolvePinnedReactPair } from './reactPin.js'

/**
 * Canonical Lab build toolchain. Keep in sync with
 * resources/lab/site-kit/package.json.
 *
 * The in-browser runtime (DeepThought) is validated against exactly this
 * stack. Model-authored package.json rewrites drifting vite to ^5/^6/^8
 * (rolldown) break the WASM optimizer with I/O errors — so toolchain
 * entries are pinned mechanically on every package.json write.
 */
export const TOOLCHAIN_DEV_DEPENDENCIES = {
    '@tailwindcss/vite': '^4.0.0',
    '@vitejs/plugin-react': '^5.0.0',
    tailwindcss: '^4.0.0',
    vite: '^7.0.0',
}

/** Runtime deps the site-kit ships — re-pin when present so "latest" / old majors cannot duplicate React. */
export const RUNTIME_DEPENDENCY_PINS = {
    'class-variance-authority': '^0.7.1',
    clsx: '^2.1.1',
    'lucide-react': '^0.511.0',
    'react-router-dom': '^7.6.0',
    'tailwind-merge': '^3.3.0',
}

export const TOOLCHAIN_SCRIPTS = {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
}

/** Packages that conflict with the managed Vite 7 + plugin-react stack. */
export const CONFLICTING_TOOLCHAIN_PACKAGES = [
    '@vitejs/plugin-react-oxc',
    '@vitejs/plugin-react-swc',
    'autoprefixer',
    'esbuild',
    'postcss',
    'rolldown',
    'rolldown-vite',
]

/** Docs-example scopes the model invents — they 404 on npm and kill in-browser install. */
const PLACEHOLDER_SCOPES = new Set([
    '@acme',
    '@example',
    '@examples',
    '@foo',
    '@bar',
    '@baz',
    '@placeholder',
    '@demo',
    '@sample',
    '@company',
    '@org',
    '@your-org',
    '@yourorg',
    '@your-company',
    '@scope',
    '@my-org',
    '@myorg',
    '@username',
])

const PLACEHOLDER_UNSCOPED = new Set([
    'acme',
    'acme-client',
    'example-api',
    'your-package',
    'placeholder-pkg',
])

/**
 * True for unpublished / docs-placeholder packages. DeepThought installs from
 * the browser against registry.npmjs.org — a 404 here aborts autostart.
 *
 * @param {string} name
 * @param {Iterable<string>} [extra]
 * @returns {boolean}
 */
export function isUninstallableLabPackage(name, extra = []) {
    const key = String(name || '').trim()
    if (! key) return true
    if (key.startsWith('.') || key.startsWith('/') || /^(https?:|data:|blob:)/i.test(key)) {
        return false
    }

    for (const row of extra || []) {
        if (String(row || '').trim() === key) return true
    }

    const lower = key.toLowerCase()
    const scope = lower.startsWith('@') ? lower.split('/')[0] : ''
    const pkg = scope
        ? lower.slice(scope.length + 1).split('/')[0]
        : lower.split('/')[0]

    if (scope && PLACEHOLDER_SCOPES.has(scope)) return true
    if (PLACEHOLDER_UNSCOPED.has(pkg)) return true
    if (/(^|[-_/])acme([-_/]|$)/.test(lower)) return true
    return false
}

function stripUninstallableDeps(bag = {}) {
    const next = { ...bag }
    for (const name of Object.keys(next)) {
        if (isUninstallableLabPackage(name)) delete next[name]
    }
    return next
}

/**
 * Force the managed toolchain onto a candidate package.json body while
 * keeping installable model-added runtime dependencies.
 *
 * @param {string} raw candidate package.json contents
 * @returns {{ body: string, changed: boolean }} normalized body (2-space JSON)
 */
export function normalizeLabPackageJson(raw) {
    let pkg
    try {
        pkg = JSON.parse(String(raw ?? ''))
    } catch {
        return { body: String(raw ?? ''), changed: false }
    }
    if (! pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
        return { body: String(raw ?? ''), changed: false }
    }

    const before = JSON.stringify(pkg)

    pkg.private = true
    pkg.type = 'module'
    pkg.scripts = { ...(pkg.scripts || {}), ...TOOLCHAIN_SCRIPTS }

    const deps = stripUninstallableDeps({ ...(pkg.dependencies || {}) })
    const devDeps = stripUninstallableDeps({ ...(pkg.devDependencies || {}) })

    // Toolchain lives in devDependencies only, at the managed versions.
    for (const name of Object.keys(TOOLCHAIN_DEV_DEPENDENCIES)) {
        delete deps[name]
    }
    for (const name of CONFLICTING_TOOLCHAIN_PACKAGES) {
        delete deps[name]
        delete devDeps[name]
    }
    Object.assign(devDeps, TOOLCHAIN_DEV_DEPENDENCIES)

    // react / react-dom stay an exact matched pair.
    const pair = resolvePinnedReactPair(deps)
    deps.react = pair.react
    deps['react-dom'] = pair.reactDom

    for (const [name, version] of Object.entries(RUNTIME_DEPENDENCY_PINS)) {
        if (Object.prototype.hasOwnProperty.call(deps, name)) {
            deps[name] = version
        }
    }

    // Never leave "latest" on installable runtime deps — it can pull duplicate React trees.
    for (const [name, spec] of Object.entries(deps)) {
        if (String(spec || '').trim().toLowerCase() === 'latest') {
            if (RUNTIME_DEPENDENCY_PINS[name]) {
                deps[name] = RUNTIME_DEPENDENCY_PINS[name]
            } else {
                delete deps[name]
            }
        }
    }

    pkg.dependencies = sortKeys(deps)
    pkg.devDependencies = sortKeys(devDeps)

    const changed = JSON.stringify(pkg) !== before
    return { body: `${JSON.stringify(pkg, null, 2)}\n`, changed }
}

/**
 * Version to pass to the guest installer. Never return undefined for a
 * managed toolchain package — `install(name, undefined)` resolves @latest
 * and that is how Vite 8 / rolldown leaks into the preview.
 *
 * @param {string} name
 * @param {Record<string, any>|null} [pkg]
 * @returns {{ skip: true } | { skip: false, version: string }}
 */
export function installSpecForPackage(name, pkg = null) {
    const key = String(name || '').trim()
    if (! key) return { skip: true }
    if (isUninstallableLabPackage(key)) return { skip: true }
    if (CONFLICTING_TOOLCHAIN_PACKAGES.includes(key)) return { skip: true }

    if (Object.prototype.hasOwnProperty.call(TOOLCHAIN_DEV_DEPENDENCIES, key)) {
        return { skip: false, version: TOOLCHAIN_DEV_DEPENDENCIES[key] }
    }

    const fromPkg = pkg?.devDependencies?.[key] ?? pkg?.dependencies?.[key]
    if (typeof fromPkg === 'string' && fromPkg.trim() && fromPkg.trim() !== 'latest') {
        return { skip: false, version: fromPkg.trim() }
    }

    // Unknown extra: still refuse @latest — a missing plugin is better than
    // a toolchain overlay. Caller should skip the install.
    return { skip: true }
}

function sortKeys(obj) {
    const sorted = {}
    for (const key of Object.keys(obj).sort()) {
        sorted[key] = obj[key]
    }
    return sorted
}
