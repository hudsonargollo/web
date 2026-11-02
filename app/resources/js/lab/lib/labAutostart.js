/**
 * Lab runtime autostart — install deps (lazy) then spawn scripts.dev/start.
 */

import {
    ensureLabSession,
    getLabRuntime,
    looksLikeVitePageReload,
    looksLikeViteReady,
    looksLikeViteRestart,
    noteGuestDevActivity,
    schedulePreviewResync,
    syncLabVfsToGuest,
    vfsContentsToFiles,
} from './labRuntime'
import { trackGuestBuildOutput } from './guestBuildErrors'
import { labConsoleLine, labConsoleName } from './labConsole'
import { seedGuestNativeWasm } from './labNativeWasm'
import { extractFailedNpmPackage, shimUninstallableBareImports } from './placeholderPackages'
import {
    installSpecForPackage,
    normalizeLabPackageJson,
    TOOLCHAIN_DEV_DEPENDENCIES,
} from './toolchainPins'
import { normalizeVfsPath } from './vfs'

/** @type {string|null} */
let lastAutostartKey = null
/** @type {string|null} */
let busyAutostartKey = null
/** @type {AbortController|null} */
let autostartAbort = null
/** @type {any} */
let runningDevProc = null
/** @type {{ write?: Function, writeln?: Function, showPrompt?: Function }|null} */
let outputTerminal = null

export const LAB_RUNTIME_PHASE = 'krikkit-lab-phase'

/** @deprecated Use LAB_RUNTIME_PHASE */
export const DEEPTHOUGHT_PHASE = LAB_RUNTIME_PHASE

/** Preview chrome + other listeners — current autostart / dev phase. */
export function publishLabPhase(phase, detail = {}) {
    if (typeof window === 'undefined') return
    try {
        window.dispatchEvent(new CustomEvent(LAB_RUNTIME_PHASE, {
            detail: { phase, ...detail, at: Date.now() },
        }))
    } catch {
        /* ignore */
    }
}

/** Bind the live xterm sink (survives Console remounts). */
export function setDeepThoughtAutostartTerminal(terminal) {
    outputTerminal = terminal || null
}

/**
 * @param {any} pod
 * @param {string} path
 */
async function pathExists(pod, path) {
    try {
        await pod.fs.stat(path)
        return true
    } catch {
        return false
    }
}

/**
 * @param {any} pod
 */
async function readPackageJson(pod) {
    try {
        const raw = await pod.fs.readFile('/package.json', 'utf8')
        return JSON.parse(typeof raw === 'string' ? raw : String(raw))
    } catch {
        return null
    }
}

/**
 * @param {any} pod
 */
async function hasInstalledModules(pod) {
    try {
        const entries = await pod.fs.readdir('/node_modules')
        if (!Array.isArray(entries) || entries.length === 0) return false
        // Ignore empty or cache-only trees.
        return entries.some((name) => name && name !== '.bin' && name !== '.package-lock.json')
    } catch {
        return false
    }
}

const VITE_CONFIG_FILES = [
    '/vite.config.js',
    '/vite.config.ts',
    '/vite.config.mjs',
    '/vite.config.cjs',
]

const SKIP_VITE_IMPORTS = new Set([
    'vite', 'fs', 'path', 'url', 'os', 'module', 'process', 'node:fs', 'node:path', 'node:url', 'node:module',
])

/**
 * Bare package name from an import specifier (`@tailwindcss/vite` stays scoped).
 * @param {string} spec
 */
export function barePackageNameFromSpecifier(spec) {
    const value = String(spec || '').trim()
    if (!value || value.startsWith('.') || value.startsWith('/') || value.startsWith('node:')) {
        return null
    }
    if (value.startsWith('@')) {
        const parts = value.split('/')
        if (parts.length < 2 || !parts[1]) return null
        return `${parts[0]}/${parts[1]}`
    }
    const name = value.split('/')[0]
    return name || null
}

/**
 * Packages imported by vite.config.* (plugins). Cache restore keys off package.json,
 * so a config import that is not listed there never lands in node_modules.
 * @param {string} source
 */
export function bareImportsFromViteConfig(source) {
    const text = String(source || '')
    const names = new Set()
    const patterns = [
        /\bfrom\s*['"]([^'"]+)['"]/g,
        /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ]
    for (const re of patterns) {
        let match
        while ((match = re.exec(text))) {
            const name = barePackageNameFromSpecifier(match[1])
            if (name && !SKIP_VITE_IMPORTS.has(name)) names.add(name)
        }
    }
    return [...names]
}

/**
 * @param {any} pod
 * @param {string} name
 */
async function packageLooksInstalled(pod, name) {
    const root = `/node_modules/${name}`
    if (!await pathExists(pod, `${root}/package.json`)) return false
    try {
        const raw = await pod.fs.readFile(`${root}/package.json`, 'utf8')
        const mf = JSON.parse(typeof raw === 'string' ? raw : String(raw))
        const exportsRoot = mf?.exports && typeof mf.exports === 'object' ? mf.exports['.'] : mf?.exports
        const fromExports = typeof exportsRoot === 'string'
            ? exportsRoot
            : (exportsRoot && typeof exportsRoot === 'object'
                ? (exportsRoot.default || exportsRoot.import || exportsRoot.require)
                : null)
        const rel = String(mf.module || mf.main || fromExports || '').replace(/^\.\//, '')
        if (rel && await pathExists(pod, `${root}/${rel}`)) return true
    } catch {
        /* fall through to conventional entries */
    }
    for (const rel of ['dist/index.mjs', 'dist/index.js', 'index.mjs', 'index.js', 'index.cjs']) {
        if (await pathExists(pod, `${root}/${rel}`)) return true
    }
    return false
}

/**
 * Vite config plugin packages that are missing (or incomplete) in guest node_modules.
 * @param {any} pod
 */
async function missingViteConfigPackages(pod) {
    const names = new Set()
    for (const file of VITE_CONFIG_FILES) {
        try {
            const raw = await pod.fs.readFile(file, 'utf8')
            for (const name of bareImportsFromViteConfig(typeof raw === 'string' ? raw : String(raw))) {
                names.add(name)
            }
        } catch {
            /* no such config */
        }
    }
    const missing = []
    for (const name of names) {
        if (!await packageLooksInstalled(pod, name)) missing.push(name)
    }
    return missing
}

/**
 * @param {any} pod
 */
async function viteMajorVersion(pod) {
    try {
        const raw = await pod.fs.readFile('/node_modules/vite/package.json', 'utf8')
        const version = JSON.parse(typeof raw === 'string' ? raw : String(raw))?.version
        const major = parseInt(String(version || '').split('.')[0], 10)
        return Number.isFinite(major) ? major : 0
    } catch {
        return 0
    }
}

/**
 * Prefer scripts.dev, then start; strip Turbopack flag for in-browser stability.
 * @param {Record<string, any>} pkg
 * @param {any} pod
 */
async function resolveDevSpawn(pkg, pod) {
    const scripts = pkg?.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {}
    const rawDev = typeof scripts.dev === 'string' ? scripts.dev.trim() : ''
    const rawStart = typeof scripts.start === 'string' ? scripts.start.trim() : ''

    const pick = rawDev || rawStart
    if (pick) {
        // next dev [--turbo] → next without turbo (browser-friendly)
        const nextMatch = pick.match(/^next(\s+dev)?(\s+.*)?$/i)
        if (nextMatch || /^next\s+dev\b/i.test(pick)) {
            const hasNext = await pathExists(pod, '/node_modules/next/package.json')
                || await pathExists(pod, '/node_modules/.bin/next')
            if (hasNext) {
                return { cmd: 'next', args: ['dev'], label: 'next dev' }
            }
        }
        if (rawDev) {
            const args = ['run', 'dev']
            const extra = []
            if (/\bvite\b/i.test(rawDev)) {
                // Vite's default clearScreen wipes xterm (boot logs + the ready banner).
                if (!/--clearScreen\b/.test(rawDev)) extra.push('--clearScreen=false')
                // CJS Vite bundles config into node_modules/.vite-temp and then
                // require()s plugins from that folder. Native loader imports
                // /vite.config.js from the project root instead.
                if (!/--configLoader\b/.test(rawDev) && (await viteMajorVersion(pod)) >= 6) {
                    extra.push('--configLoader', 'native')
                }
            }
            if (extra.length) args.push('--', ...extra)
            return { cmd: 'npm', args, label: 'npm run dev' }
        }
        return { cmd: 'npm', args: ['run', 'start'], label: 'npm run start' }
    }

    for (const file of ['server.js', 'index.js', 'app.js']) {
        if (await pathExists(pod, `/${file}`)) {
            return { cmd: 'node', args: [file], label: `node ${file}` }
        }
    }

    return null
}

/**
 * @param {{ write?: (s: string) => void, writeln?: (s: string) => void }|null} terminal
 * @param {string} line
 * @param {boolean} [err]
 */
function termLine(terminal, line, err = false) {
    const sink = outputTerminal || terminal
    const text = err ? `\x1b[31m${line}\x1b[0m` : line
    if (sink?.writeln) sink.writeln(text)
    else if (sink?.write) sink.write(`${text}\r\n`)
}

/**
 * Drop TTY "clear screen" sequences. Vite/Next emit these on ready/restart
 * and xterm treats them as a real wipe — boot logs and the ready banner vanish.
 * @param {string} chunk
 */
function sanitizePtyChunk(chunk) {
    return String(chunk || '')
        .replace(/\x1Bc/g, '')
        .replace(/\x1B\[[0-3]?J/g, '')
        .replace(/\x1B\[[0-9;]*[Hf]/g, '')
        .replace(/(?:\r?\n){8,}/g, '\n\n')
        .replace(/\r?\n/g, '\r\n')
}

/**
 * @param {{ write?: (s: string) => void }|null} terminal
 * @param {string} chunk
 * @param {boolean} [err]
 */
function termChunk(terminal, chunk, err = false) {
    const sink = outputTerminal || terminal
    const text = sanitizePtyChunk(chunk)
    if (!text) return
    if (err && sink?.write) {
        sink.write(`\x1b[31m${text}\x1b[0m`)
        return
    }
    sink?.write?.(text)
}

function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
            return
        }
        const id = setTimeout(resolve, ms)
        signal?.addEventListener('abort', () => {
            clearTimeout(id)
            reject(new DOMException('Aborted', 'AbortError'))
        }, { once: true })
    })
}

/**
 * Wait for Lab VFS hydrate to land package.json in the guest FS.
 * @param {any} pod
 * @param {{ getFiles?: () => Record<string, string>, signal?: AbortSignal, timeoutMs?: number }} opts
 */
async function waitForPackageJson(pod, opts = {}) {
    const timeoutMs = opts.timeoutMs ?? 25_000
    const start = Date.now()
    let lastSync = 0

    while (Date.now() - start < timeoutMs) {
        if (opts.signal?.aborted) return null

        const now = Date.now()
        if (typeof opts.getFiles === 'function' && now - lastSync > 400) {
            lastSync = now
            try {
                const files = opts.getFiles() || {}
                if (Object.keys(files).length) {
                    await syncLabVfsToGuest(files)
                }
            } catch {
                /* ignore sync races */
            }
        }

        const pkg = await readPackageJson(pod)
        if (pkg) return pkg

        try {
            await sleep(250, opts.signal)
        } catch {
            return null
        }
    }

    return readPackageJson(pod)
}

/**
 * Rewrite the guest package.json to the managed toolchain before npm install.
 * Stops a model-authored vite@8 (or a stale cache keyed on it) from booting.
 *
 * @param {any} pod
 * @param {Record<string, any>|null} pkg
 */
async function pinGuestPackageJson(pod, pkg) {
    if (! pkg || typeof pkg !== 'object') return pkg
    const { body, changed } = normalizeLabPackageJson(JSON.stringify(pkg))
    if (! changed) return pkg
    try {
        await pod.fs.writeFile('/package.json', body)
    } catch {
        return pkg
    }
    try {
        return JSON.parse(body)
    } catch {
        return pkg
    }
}

/**
 * Install from /package.json. If the registry 404s an unpublished name,
 * drop it, rewrite guest imports to a local shim, and retry.
 *
 * @param {{
 *   pod: any,
 *   installer: any,
 *   pkg: Record<string, any>,
 *   flags: object,
 *   terminal?: any,
 *   getFiles?: (() => Record<string, string>)|null,
 *   signal?: AbortSignal,
 *   note?: (line: string) => void,
 * }} args
 */
async function installManifestSkippingUnpublished(args) {
    const { pod, installer, flags, terminal, getFiles, signal, note } = args
    let pkg = args.pkg
    const skipped = []

    for (let attempt = 0; attempt < 8; attempt++) {
        if (signal?.aborted) return pkg
        try {
            if (installer.installFromManifest) {
                await installer.installFromManifest('/package.json', flags)
            } else {
                await installer.install(undefined, undefined, flags)
            }
            return pkg
        } catch (err) {
            const name = extractFailedNpmPackage(err)
            if (! name || skipped.includes(name)) throw err
            skipped.push(name)
            const line = `${labConsoleName()} · skipping unpublished package ${name}`
            termLine(terminal, `\x1b[90m${line}\x1b[0m`)
            note?.(line)

            if (pkg?.dependencies) delete pkg.dependencies[name]
            if (pkg?.devDependencies) delete pkg.devDependencies[name]
            const pinned = normalizeLabPackageJson(JSON.stringify(pkg))
            await pod.fs.writeFile('/package.json', pinned.body)
            try {
                pkg = JSON.parse(pinned.body)
            } catch {
                /* keep stripped object */
            }

            const host = typeof getFiles === 'function' ? (getFiles() || {}) : {}
            if (host && typeof host === 'object' && Object.keys(host).length) {
                /** @type {Record<string, string>} */
                const relative = {}
                for (const [raw, body] of Object.entries(host)) {
                    if (body == null) continue
                    relative[normalizeVfsPath(raw)] = typeof body === 'string' ? body : String(body)
                }
                if (relative['package.json']) {
                    relative['package.json'] = pinned.body
                }
                const healed = shimUninstallableBareImports(relative, { extraPackages: skipped })
                await syncLabVfsToGuest(healed.files, { force: true })
            }
        }
    }

    throw new Error('Too many unpublished packages in package.json')
}

/**
 * Vite 8+ (rolldown) breaks the in-browser WASM optimizer. Force the
 * managed 7.x pin when a lazy @latest overlay already landed.
 *
 * @param {any} pod
 * @param {any} installer
 * @param {object} flags
 * @param {any} terminal
 * @param {AbortSignal} [signal]
 */
async function pinGuestViteIfUnsupported(pod, installer, flags, terminal, signal) {
    const major = await viteMajorVersion(pod)
    if (major < 8) return
    if (typeof installer?.install !== 'function') return
    termLine(terminal, `\x1b[90m${labConsoleName()} · pinning vite@7 (Vite 8 / rolldown is unsupported in Lab)\x1b[0m`)
    if (signal?.aborted) return
    await installer.install('vite', TOOLCHAIN_DEV_DEPENDENCIES.vite, flags)
    const plugin = installSpecForPackage('@tailwindcss/vite')
    if (! plugin.skip) {
        await installer.install('@tailwindcss/vite', plugin.version, flags)
    }
}

/**
 * Install + start for the current Lab runtime pod. Safe to call repeatedly;
 * only one run per project key.
 *
 * @param {{
 *   projectKey: string,
 *   files?: Record<string, string>,
 *   getFiles?: () => Record<string, string>,
 *   terminal?: { write?: Function, writeln?: Function, showPrompt?: Function }|null,
 *   onPhase?: (phase: string, detail?: any) => void,
 *   signal?: AbortSignal,
 * }} opts
 */
export async function runLabAutostart(opts) {
    const projectKey = String(opts.projectKey || '')
    if (!projectKey) return { ok: false, reason: 'no-project' }

    if (lastAutostartKey === projectKey && runningDevProc) {
        if (opts.terminal) setDeepThoughtAutostartTerminal(opts.terminal)
        const livePod = getLabRuntime()
        let restart = false
        if (livePod) {
            try {
                const seeded = await seedGuestNativeWasm(livePod)
                if (seeded > 0) {
                    restart = true
                    publishLabPhase('dev', { reason: 'wasm-seed' })
                    try { runningDevProc.kill?.() } catch { /* ignore */ }
                    runningDevProc = null
                    lastAutostartKey = null
                }
            } catch {
                /* keep the running preview */
            }
        }
        if (!restart) {
            // PreviewFrame may have missed the original dev-running event, or a
            // later warm boot event left chrome stuck on "Starting preview…".
            publishLabPhase('dev-running', { reason: 'already-running' })
            return { ok: true, reason: 'already-running' }
        }
    }

    if (busyAutostartKey === projectKey) {
        if (opts.terminal) setDeepThoughtAutostartTerminal(opts.terminal)
        return { ok: true, reason: 'in-flight' }
    }

    autostartAbort?.abort()
    const ac = new AbortController()
    autostartAbort = ac
    busyAutostartKey = projectKey
    if (opts.signal) {
        if (opts.signal.aborted) {
            ac.abort()
        } else {
            opts.signal.addEventListener('abort', () => ac.abort(), { once: true })
        }
    }

    const terminal = opts.terminal || null
    if (terminal) setDeepThoughtAutostartTerminal(terminal)
    const onPhase = (phase, detail) => {
        publishLabPhase(phase, detail)
        if (typeof opts.onPhase === 'function') opts.onPhase(phase, detail)
    }

    onPhase('boot')
    const getFiles = typeof opts.getFiles === 'function'
        ? opts.getFiles
        : (opts.files ? () => opts.files : null)

    const clearBusy = () => {
        if (busyAutostartKey === projectKey) busyAutostartKey = null
    }

    try {
        const seed = getFiles ? (getFiles() || {}) : (opts.files || null)
        if (seed && Object.keys(seed).length) {
            await ensureLabSession({ files: seed })
            await syncLabVfsToGuest(seed)
        } else {
            await ensureLabSession()
        }

        if (ac.signal.aborted) {
            if (lastAutostartKey === projectKey) lastAutostartKey = null
            clearBusy()
            return { ok: false, reason: 'aborted' }
        }

        const pod = getLabRuntime()
        if (!pod) {
            clearBusy()
            return { ok: false, reason: 'no-engine' }
        }

        termLine(terminal, `\x1b[90m${labConsoleLine('waiting')}\x1b[0m`)
        let pkg = await waitForPackageJson(pod, {
            getFiles: getFiles || undefined,
            signal: ac.signal,
        })
        if (!pkg) {
            if (ac.signal.aborted) {
                if (lastAutostartKey === projectKey) lastAutostartKey = null
                clearBusy()
                return { ok: false, reason: 'aborted' }
            }
            termLine(terminal, `\x1b[90m${labConsoleLine('no_package')}\x1b[0m`)
            onPhase('skip', { reason: 'no-package-json' })
            terminal?.showPrompt?.()
            clearBusy()
            return { ok: true, reason: 'no-package-json' }
        }

        pkg = await pinGuestPackageJson(pod, pkg) || pkg

        lastAutostartKey = projectKey
        onPhase('boot')

        const installFlags = {
            withDevDeps: true,
            // Lazy transforms — extract now, convert on first require (IndexedDB cacheable).
            transformModules: false,
            onProgress: (message) => {
                if (ac.signal.aborted) return
                const line = String(message || '').trim()
                if (line) termLine(terminal, `\x1b[90m${line}\x1b[0m`)
            },
        }

        const installed = await hasInstalledModules(pod)
        if (!installed) {
            termLine(terminal, `\x1b[36m${labConsoleLine('installing')}\x1b[0m`)
            onPhase('install')

            const installer = pod.packages
            if (!installer?.installFromManifest && !installer?.install) {
                termLine(terminal, 'packages.install unavailable', true)
                onPhase('error', { reason: 'no-installer' })
                lastAutostartKey = null
                clearBusy()
                terminal?.showPrompt?.()
                return { ok: false, reason: 'no-installer' }
            }

            if (installer.installFromManifest) {
                pkg = await installManifestSkippingUnpublished({
                    pod,
                    installer,
                    pkg,
                    flags: installFlags,
                    terminal,
                    getFiles,
                    signal: ac.signal,
                }) || pkg
            } else {
                await installer.install(undefined, undefined, installFlags)
            }

            if (ac.signal.aborted) {
                if (lastAutostartKey === projectKey) lastAutostartKey = null
                clearBusy()
                return { ok: false, reason: 'aborted' }
            }
            termLine(terminal, `\x1b[32m${labConsoleLine('ready')}\x1b[0m`)
            onPhase('install-done')
        } else {
            termLine(terminal, `\x1b[90m${labConsoleLine('cache_hit')}\x1b[0m`)
            onPhase('install-cached')
        }

        const missingVitePkgs = await missingViteConfigPackages(pod)
        if (missingVitePkgs.length) {
            const installer = pod.packages
            if (installer?.install) {
                termLine(terminal, `\x1b[36m${labConsoleLine('installing')}\x1b[0m`)
                onPhase('install', { reason: 'vite-config-plugins', packages: missingVitePkgs })
                const pluginFlags = {
                    ...installFlags,
                    persist: false,
                }
                for (const name of missingVitePkgs) {
                    if (ac.signal.aborted) break
                    const spec = installSpecForPackage(name, pkg)
                    if (spec.skip) continue
                    termLine(terminal, `\x1b[90m${name}@${spec.version}\x1b[0m`)
                    await installer.install(name, spec.version, pluginFlags)
                }
                if (ac.signal.aborted) {
                    if (lastAutostartKey === projectKey) lastAutostartKey = null
                    clearBusy()
                    return { ok: false, reason: 'aborted' }
                }
                termLine(terminal, `\x1b[32m${labConsoleLine('ready')}\x1b[0m`)
                onPhase('install-done', { reason: 'vite-config-plugins' })
            }
        }

        if (ac.signal.aborted) {
            if (lastAutostartKey === projectKey) lastAutostartKey = null
            clearBusy()
            return { ok: false, reason: 'aborted' }
        }

        try {
            await pinGuestViteIfUnsupported(pod, pod.packages, installFlags, terminal, ac.signal)
        } catch {
            /* spawn may still fail loud; better than silently booting Vite 8 */
        }

        if (ac.signal.aborted) {
            if (lastAutostartKey === projectKey) lastAutostartKey = null
            clearBusy()
            return { ok: false, reason: 'aborted' }
        }

        try {
            const seeded = await seedGuestNativeWasm(pod)
            if (seeded > 0) {
                termLine(terminal, `\x1b[90m${labConsoleLine('wasm_ready')}\x1b[0m`)
            }
        } catch {
            /* preview can still boot; CSS may stay unstyled until retry */
        }

        // VFS hydrate can finish after the first sync — push the latest snapshot
        // before Vite starts so imports like ./components/Header resolve on refresh.
        if (getFiles) {
            const latest = getFiles() || {}
            if (Object.keys(latest).length) {
                await syncLabVfsToGuest(latest, { force: true })
            }
        }

        const spawnSpec = await resolveDevSpawn(pkg, pod)
        if (!spawnSpec) {
            termLine(terminal, `\x1b[90m${labConsoleLine('no_script')}\x1b[0m`)
            onPhase('skip', { reason: 'no-script' })
            terminal?.showPrompt?.()
            clearBusy()
            return { ok: true, reason: 'no-script' }
        }

        if (runningDevProc) {
            try {
                runningDevProc.kill?.()
            } catch {
                /* ignore */
            }
            runningDevProc = null
        }

        termLine(terminal, `\x1b[36m${labConsoleLine('auto_start', { command: spawnSpec.label })}\x1b[0m`)
        onPhase('dev', { label: spawnSpec.label })

        // Corrupt/empty webpack pack files in VFS trigger PackFileCacheStrategy
        // failures and missing clientReferenceManifest during RSC compile.
        for (const cachePath of ['/.next/cache/webpack', '/.next/cache']) {
            try {
                await pod.fs.rm(cachePath, { recursive: true, force: true })
            } catch {
                /* ignore missing / busy cache dirs */
            }
        }

        const proc = await pod.spawn(spawnSpec.cmd, spawnSpec.args, {
            cwd: '/',
            signal: ac.signal,
            env: {
                NEXT_DISABLE_SWC_WASM: '1',
                // Vite/Next skip TTY clearScreen when CI is set.
                CI: 'true',
                FORCE_COLOR: '1',
            },
        })
        runningDevProc = proc
        clearBusy()

        let ignorePageReloadUntil = 0
        proc.on?.('output', (text) => {
            if (ac.signal.aborted) return
            termChunk(terminal, text, false)
            noteGuestDevActivity()
            trackGuestBuildOutput(text)
            if (looksLikeViteRestart(text)) {
                onPhase('dev', { reason: 'vite-restart' })
                ignorePageReloadUntil = Date.now() + 8_000
            }
            if (looksLikeVitePageReload(text) && Date.now() >= ignorePageReloadUntil) {
                schedulePreviewResync('vite-page-reload', 200)
            }
            if (looksLikeViteReady(text)) {
                onPhase('dev-running', { reason: 'vite-ready' })
                ignorePageReloadUntil = 0
                schedulePreviewResync('vite-ready', 280)
            }
        })
        proc.on?.('error', (text) => {
            if (ac.signal.aborted) return
            termChunk(terminal, text, true)
            noteGuestDevActivity()
            trackGuestBuildOutput(text)
        })
        proc.on?.('exit', (code) => {
            if (runningDevProc === proc) runningDevProc = null
            if (ac.signal.aborted) return
            termLine(terminal, `\x1b[90m${labConsoleLine('exited', { command: spawnSpec.label, code })}\x1b[0m`)
            ;(outputTerminal || terminal)?.showPrompt?.()
            onPhase('dev-exit', { code })
        })

        onPhase('dev-running', { label: spawnSpec.label })
        return { ok: true, reason: 'dev-started', label: spawnSpec.label }
    } catch (err) {
        clearBusy()
        if (ac.signal.aborted) {
            if (lastAutostartKey === projectKey) lastAutostartKey = null
            return { ok: false, reason: 'aborted' }
        }
        const message = err?.message || String(err)
        termLine(terminal, labConsoleLine('failed', { error: message }), true)
        onPhase('error', { message })
        if (lastAutostartKey === projectKey) lastAutostartKey = null
        ;(outputTerminal || opts.terminal)?.showPrompt?.()
        return { ok: false, reason: 'error', message }
    }
}

/**
 * Sync VFS, install deps, and pin toolchain — without starting the dev server.
 * Used for in-browser production builds before publish upload.
 *
 * @param {{
 *   files?: Record<string, string>,
 *   getFiles?: () => Record<string, string>,
 *   onPhase?: (phase: string, detail?: any) => void,
 *   onLog?: (line: string) => void,
 *   signal?: AbortSignal,
 *   light?: boolean,
 * }} opts
 */
export async function prepareLabGuestForBuild(opts = {}) {
    const ac = new AbortController()
    if (opts.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
    }
    opts.signal?.addEventListener('abort', () => ac.abort(), { once: true })

    const note = (line) => {
        if (typeof opts.onLog === 'function') opts.onLog(line)
    }

    const onPhase = (phase, detail) => {
        publishLabPhase(phase, detail)
        if (typeof opts.onPhase === 'function') opts.onPhase(phase, detail)
        if (phase === 'install-log' && detail?.line) return
        const label = {
            boot: 'Starting runtime…',
            sync: 'Syncing project files…',
            install: 'Installing packages…',
            'install-cached': 'Using cached packages.',
            'install-done': 'Packages ready.',
        }[phase]
        if (label) note(label)
    }

    const getFiles = typeof opts.getFiles === 'function'
        ? opts.getFiles
        : (opts.files ? () => opts.files : null)

    const warmPod = getLabRuntime()
    const light = Boolean(opts.light) && warmPod
    const seed = getFiles ? (getFiles() || {}) : (opts.files || null)

    if (warmPod) {
        if (light) {
            note('Using cached runtime and project files.')
            onPhase('install-cached')
        } else {
            onPhase('sync')
            if (seed && Object.keys(seed).length) {
                await syncLabVfsToGuest(seed)
            }
        }
    } else {
        onPhase('boot')
        if (seed && Object.keys(seed).length) {
            await ensureLabSession({ files: seed })
            await syncLabVfsToGuest(seed)
        } else {
            await ensureLabSession()
        }
    }

    if (ac.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
    }

    const pod = getLabRuntime()
    if (!pod) {
        throw new Error('Lab runtime is not ready.')
    }

    onPhase('sync')
    let pkg = await waitForPackageJson(pod, {
        getFiles: light ? undefined : (getFiles || undefined),
        signal: ac.signal,
    })
    if (!pkg) {
        throw new Error('package.json was not found in this project.')
    }

    pkg = await pinGuestPackageJson(pod, pkg) || pkg

    const installFlags = {
        withDevDeps: true,
        transformModules: false,
        onProgress: (message) => {
            if (ac.signal.aborted) return
            const line = String(message || '').trim()
            if (line) {
                onPhase('install-log', { line })
                note(line)
            }
        },
    }

    const installed = await hasInstalledModules(pod)
    if (!installed) {
        onPhase('install')
        const installer = pod.packages
        if (!installer?.installFromManifest && !installer?.install) {
            throw new Error('Package installer is unavailable in this browser session.')
        }
        if (installer.installFromManifest) {
            pkg = await installManifestSkippingUnpublished({
                pod,
                installer,
                pkg,
                flags: installFlags,
                getFiles,
                signal: ac.signal,
                note: (line) => {
                    onPhase('install-log', { line })
                    note(line)
                },
            }) || pkg
        } else {
            await installer.install(undefined, undefined, installFlags)
        }
        onPhase('install-done')
    } else {
        onPhase('install-cached')
    }

    const missingVitePkgs = light ? [] : await missingViteConfigPackages(pod)
    if (missingVitePkgs.length) {
        const installer = pod.packages
        if (installer?.install) {
            onPhase('install', { reason: 'vite-config-plugins', packages: missingVitePkgs })
            const pluginFlags = { ...installFlags, persist: false }
            for (const name of missingVitePkgs) {
                if (ac.signal.aborted) break
                const spec = installSpecForPackage(name, pkg)
                if (spec.skip) continue
                await installer.install(name, spec.version, pluginFlags)
            }
            onPhase('install-done', { reason: 'vite-config-plugins' })
        }
    }

    if (ac.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
    }

    if (! light) {
        try {
            await pinGuestViteIfUnsupported(pod, pod.packages, installFlags, null, ac.signal)
        } catch {
            /* spawn may still fail loud */
        }
    }

    if (! warmPod && ! light) {
        try {
            await seedGuestNativeWasm(pod)
        } catch {
            /* build may still succeed */
        }
    }

    return { pod, pkg }
}

export function pauseLabDevServerForPublish() {
    try {
        runningDevProc?.kill?.()
    } catch {
        /* ignore */
    }
    runningDevProc = null
}

/** Cancel in-flight autostart / kill spawned dev process. */
export function resetLabAutostart() {
    autostartAbort?.abort()
    autostartAbort = null
    lastAutostartKey = null
    busyAutostartKey = null
    outputTerminal = null
    try {
        runningDevProc?.kill?.()
    } catch {
        /* ignore */
    }
    runningDevProc = null
}

export function vfsFilesFromLab(files) {
    return vfsContentsToFiles(files)
}

/** @deprecated Use publishLabPhase */
export const publishDeepThoughtPhase = publishLabPhase
/** @deprecated Use runLabAutostart */
export const runDeepThoughtAutostart = runLabAutostart
/** @deprecated Use prepareLabGuestForBuild */
export const prepareDeepThoughtGuestForBuild = prepareLabGuestForBuild
/** @deprecated Use pauseLabDevServerForPublish */
export const pauseDeepThoughtDevServerForPublish = pauseLabDevServerForPublish
/** @deprecated Use resetLabAutostart */
export const resetDeepThoughtAutostart = resetLabAutostart
