/**
 * Lab ↔ in-browser Node runtime (core in resources/js/lab/runtime/).
 * Pods boot via LabRuntime.boot().
 */

import { LabRuntime } from './labRuntimeEngine'
import { pinLabRuntimeHost } from './labRuntimeHost'
import { shimUninstallableBareImports } from './placeholderPackages'
import { PREVIEW_CHROME_SCRIPT } from './previewChromeBridge'
import { guestWriteNeedsReload, guestWriteRestartsDev, PREVIEW_RESYNC_EVENT } from './previewReload'
import { normalizeLabPackageJson } from './toolchainPins'
import { normalizeGuestRouter, GUEST_CUSTOM_ROUTER_REL_PATHS, isCustomRouterFile } from './normalizeGuestRouter'
import { normalizeGuestUiKit, projectUsesButtonAsChild, CANONICAL_BUTTON } from './normalizeGuestUiKit'
import { healUiImports } from './healUiImports'
import { applyComponentStubHeal } from './componentStub'
import { normalizeVfsPath } from './vfs'

export { guestWriteNeedsReload, guestWriteRestartsDev, looksLikeVitePageReload, PREVIEW_RESYNC_EVENT } from './previewReload'

const SW_URL = '/__krikkit_lab_sw__.js?v=host-vite-5173-29'
const SW_MIGRATION_KEY = 'krikkit-lab-sw-migration-v1'
// Bump when public/__worker__.js polyfills change (avoids sticky Worker caches).
const WORKER_URL = '/__worker__.js?v=histfile-dev-null-1'
const LEGACY_IDB_RESET_KEY = 'krikkit-deepthought-legacy-cache-v1'

/** @type {import('../runtime/dist/index').LabRuntime|null} */
let engine = null
/** @type {Promise<any>|null} */
let readyPromise = null
/** @type {number|null} */
let previewPort = null
/** @type {string|null} */
let previewUrl = null
/** @type {Set<(ev: any) => void>} */
const portListeners = new Set()
/** Host→guest last written content (avoids mtime churn / Next config restart loops). */
const guestSyncedContent = new Map()

/** Preview iframe should remount after guest Vite dies and comes back. */

let previewResyncTimer = 0

/**
 * Debounce iframe remounts so a bulk VFS write is one retry, not N.
 * @param {string} [reason]
 * @param {number} [delayMs]
 */
export function schedulePreviewResync(reason = 'guest', delayMs = 400) {
    if (typeof window === 'undefined') return
    window.clearTimeout(previewResyncTimer)
    previewResyncTimer = window.setTimeout(() => {
        try {
            window.dispatchEvent(new CustomEvent(PREVIEW_RESYNC_EVENT, {
                detail: { reason, at: Date.now() },
            }))
        } catch {
            /* ignore */
        }
    }, Math.max(0, Number(delayMs) || 0))
}

export function looksLikeViteReady(text) {
    return /\bready in\s+\d|\bLocal:\s+https?:\/\/|➜\s+Local:/i.test(String(text || ''))
}

export function looksLikeViteRestart(text) {
    return /\b(?:server restarted|restarting server)\b/i.test(String(text || ''))
}

/** Remount the preview iframe immediately (after guest files that Vite cannot HMR). */
export function requestPreviewResync(reason = 'guest') {
    if (typeof window === 'undefined') return
    window.clearTimeout(previewResyncTimer)
    previewResyncTimer = 0
    try {
        window.dispatchEvent(new CustomEvent(PREVIEW_RESYNC_EVENT, {
            detail: { reason, at: Date.now() },
        }))
    } catch {
        /* ignore */
    }
}

/** Last time the guest dev server printed anything — fed by the autostart output hook. */
let lastGuestDevOutputAt = 0

export function noteGuestDevActivity() {
    lastGuestDevOutputAt = Date.now()
}

/**
 * Resolve once the guest dev server has been silent for `quietMs` (Vite done
 * transforming), or after `maxWaitMs` regardless. Remounting the preview while
 * Vite is still rebuilding serves a stylesheet compiled before this turn's
 * files existed — the page renders with broken styles until a manual reload.
 */
export async function waitForGuestDevQuiet({ quietMs = 350, maxWaitMs = 4_000 } = {}) {
    const start = Date.now()
    // Give the in-pod watcher a beat to react to writes we just issued.
    await new Promise((resolve) => setTimeout(resolve, 200))
    for (;;) {
        const idle = lastGuestDevOutputAt === 0 || (Date.now() - lastGuestDevOutputAt) >= quietMs
        if (idle || Date.now() - start >= maxWaitMs) return
        await new Promise((resolve) => setTimeout(resolve, 100))
    }
}

/**
 * Remount only if Vite never emits ready / page-reload. Immediate remount
 * during a server restart leaves the iframe on an empty shell ("running").
 */
export function schedulePreviewResyncFallback(reason = 'guest', timeoutMs = 10_000) {
    if (typeof window === 'undefined') return
    const wait = Math.max(0, Number(timeoutMs) || 0)
    const onHit = () => {
        window.clearTimeout(timer)
        window.removeEventListener(PREVIEW_RESYNC_EVENT, onHit)
    }
    const timer = window.setTimeout(() => {
        window.removeEventListener(PREVIEW_RESYNC_EVENT, onHit)
        requestPreviewResync(reason)
    }, wait)
    window.addEventListener(PREVIEW_RESYNC_EVENT, onHit)
}

const SKIP_SYNC_RE = /(?:^|\/)(?:node_modules|\.next|\.git|dist|build|coverage)(?:\/|$)/i

/**
 * Remove AI-authored router wrappers from the guest pod. normalizeGuestRouter
 * strips them from Lab→guest patches, but stale files can linger in the pod
 * and shadow react-router-dom (invalid hook call / useRef null).
 *
 * @param {import('../runtime/dist/index').LabRuntime|null} [pod]
 * @returns {Promise<number>}
 */
export async function purgeGuestCustomRouterFiles(pod = engine) {
    const target = pod || engine
    if (! target?.fs?.rm) return 0
    let removed = 0
    for (const rel of GUEST_CUSTOM_ROUTER_REL_PATHS) {
        for (const path of [rel, `/${rel}`]) {
            try {
                await target.fs.rm(path, { force: true })
                guestSyncedContent.delete(path)
                guestSyncedContent.delete(path.replace(/^\//, ''))
                removed += 1
            } catch {
                /* not present */
            }
        }
    }
    return removed
}

/**
 * Soft-patch Next config in the guest only (not Lab disk) so the Preview
 * tunnel origin (127.0.0.1) is allowed without rewriting on every sync.
 * @param {string} path
 * @param {string} source
 */
function maybePatchNextConfigForLab(path, source) {
    if (!/\/next\.config\.(js|mjs|cjs|ts)$/i.test(path)) return source
    let out = source

    if (!/allowedDevOrigins\s*:/.test(out)) {
        const origins = `['127.0.0.1', 'localhost']`
        if (/export\s+default\s*\{/.test(out)) {
            out = out.replace(
                /export\s+default\s*\{/,
                `export default {\n  allowedDevOrigins: ${origins},`,
            )
        } else if (/module\.exports\s*=\s*\{/.test(out)) {
            out = out.replace(
                /module\.exports\s*=\s*\{/,
                `module.exports = {\n  allowedDevOrigins: ${origins},`,
            )
        } else if (/=\s*\{/.test(out) && /export\s+default\s+\w+/.test(out)) {
            out = out.replace(
                /=\s*\{/,
                `= {\n  allowedDevOrigins: ${origins},`,
            )
        }
    }

    // Guest-only webpack: disable pack.gz cache, and inject CSS via
    // next-style-loader (same model as Vite) so Preview does not depend on
    // cross-origin <link href="http://localhost:3000/_next/static/css/...">.
    if (!/__krikkitLabWebpack/.test(out)) {
        out = out.replace(
            /webpack:\s*\(config\)\s*=>\s*\{\s*config\.cache\s*=\s*false;\s*return config\s*\}/,
            `webpack: ${LAB_WEBPACK_FN}`,
        )
    }
    if (!/__krikkitLabWebpack/.test(out)) {
        const exported = out.match(/export\s+default\s+([A-Za-z_$][\w$]*)/)
        const name = exported && exported[1]
        if (name && name !== 'function') {
            out += `\n;(() => { const __c = ${name}; if (!__c || typeof __c !== 'object' || (__c.webpack && __c.webpack.__krikkitLab)) return; const __prev = __c.webpack; const __lab = ${LAB_WEBPACK_FN}; const __wrap = function __krikkitLabWebpack(config, ctx) { if (typeof __prev === 'function') { const n = __prev(config, ctx); if (n) config = n; } return __lab(config, ctx); }; __wrap.__krikkitLab = true; __c.webpack = __wrap; })();\n`
        } else if (/export\s+default\s*\{/.test(out)) {
            out = out.replace(
                /export\s+default\s*\{/,
                `export default {\n  webpack: ${LAB_WEBPACK_FN},`,
            )
        } else if (/module\.exports\s*=\s*\{/.test(out)) {
            out = out.replace(
                /module\.exports\s*=\s*\{/,
                `module.exports = {\n  webpack: ${LAB_WEBPACK_FN},`,
            )
        }
    }

    return out
}

/**
 * Soft-patch Vite config in the guest only so shell/runtime files under
 * /tmp and /home do not trigger `page reload` / full restart.
 * @param {string} path
 * @param {string} source
 */
function maybePatchViteConfigForLab(path, source) {
    if (!/\/vite\.config\.(js|mjs|cjs|ts)$/i.test(path)) return source
    if (/__krikkitLabWatch/.test(source)) return source

    const wrap = `function __krikkitLabWatch(config) {
  if (!config || typeof config !== 'object') return config;
  var server = Object.assign({}, config.server || {});
  var watch = Object.assign({}, server.watch || {});
  var extra = ['**/tmp/**', '**/home/**', '**/.krikkit_history', '**/.deepthought_history'];
  var prev = watch.ignored;
  watch.ignored = !prev ? extra : Array.isArray(prev) ? prev.concat(extra) : [prev].concat(extra);
  server.watch = watch;
  return Object.assign({}, config, { server: server });
}
function __krikkitLabWatchWrap(raw) {
  if (typeof raw === 'function') {
    return function (env) {
      var out = raw(env);
      return out && typeof out.then === 'function' ? out.then(__krikkitLabWatch) : __krikkitLabWatch(out);
    };
  }
  return __krikkitLabWatch(raw);
}
`

    if (/export\s+default\s+/.test(source)) {
        return wrap + source.replace(/export\s+default\s+/, 'export default __krikkitLabWatchWrap(') + '\n)\n'
    }
    if (/module\.exports\s*=/.test(source)) {
        return wrap + source.replace(/module\.exports\s*=/, 'module.exports = __krikkitLabWatchWrap(') + '\n)\n'
    }

    return source
}

function maybePatchGuestConfig(path, source) {
    return maybePatchViteConfigForLab(path, maybePatchNextConfigForLab(path, source))
}

/** Guest webpack hook — cache off + CSS as <style> tags (not extracted files). */
const LAB_WEBPACK_FN = `function __krikkitLabWebpack(config, ctx) {
  if (!config || typeof config !== 'object') return config;
  config.cache = false;
  if (ctx && ctx.isServer) return config;
  try {
    config.plugins = (config.plugins || []).filter(function (p) {
      var n = p && p.constructor && p.constructor.name;
      return n !== 'MiniCssExtractPlugin' && n !== 'CssExtractRspackPlugin';
    });
    var isExtract = function (l) {
      if (!l) return false;
      var s = typeof l === 'string' ? l : String((l && l.loader) || '');
      return /mini-css-extract|css-extract-rspack/i.test(s);
    };
    var styleLoader = {
      loader: 'next-style-loader',
      options: {
        insert: function (element) {
          var a = typeof document !== 'undefined' && document.querySelector('#__next_css__DO_NOT_USE__');
          if (a && a.parentNode) a.parentNode.insertBefore(element, a);
          else if (typeof document !== 'undefined') (document.head || document.documentElement).appendChild(element);
        }
      }
    };
    var swap = function (use) {
      if (!use) return use;
      if (Array.isArray(use)) return use.map(swap);
      if (isExtract(use)) return styleLoader;
      return use;
    };
    var walk = function (rules) {
      if (!rules) return;
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        if (!rule) continue;
        if (rule.use) rule.use = swap(rule.use);
        if (rule.loader && isExtract(rule)) {
          rule.loader = styleLoader.loader;
          rule.options = styleLoader.options;
        }
        if (rule.oneOf) walk(rule.oneOf);
        if (rule.rules) walk(rule.rules);
      }
    };
    if (config.module) walk(config.module.rules);
  } catch (e) {}
  return config;
}`

function shouldSkipGuestSyncPath(path) {
    return SKIP_SYNC_RE.test(path)
}

/** Unregister legacy DeepThought SW scripts once so Lab uses the Krikkit path. */
async function migrateLabServiceWorkerRegistration() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    try {
        if (window.localStorage?.getItem(SW_MIGRATION_KEY) === '1') return
    } catch {
        /* ignore */
    }

    try {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
            regs.map(async (reg) => {
                const scriptUrl =
                    reg.active?.scriptURL
                    || reg.installing?.scriptURL
                    || reg.waiting?.scriptURL
                    || ''
                if (scriptUrl.includes('__deepthought_sw__')) {
                    await reg.unregister()
                }
            }),
        )
    } catch {
        /* ignore */
    }

    try {
        window.localStorage?.setItem(SW_MIGRATION_KEY, '1')
    } catch {
        /* ignore */
    }
}

/**
 * One-shot wipe of old RV64 emulator asset caches (IndexedDB + Cache Storage).
 */
export async function resetLegacyLabRuntimeCaches() {
    if (typeof window === 'undefined') return
    await migrateLabServiceWorkerRegistration()
    try {
        if (window.localStorage?.getItem(LEGACY_IDB_RESET_KEY) === '1') return
    } catch {
        /* ignore */
    }

    const idbNames = [
        'deepthought-asset-cache',
        'krikkit-deepthought',
        'krikkit-deepthought-assets',
        'krikkit-deepthought-v1',
        'krikkit-deepthought-v2',
        // Legacy runtime DB names are migrated via openLabIdb — do not delete here.
    ]

    if (typeof indexedDB !== 'undefined') {
        await Promise.all(
            idbNames.map(
                (name) =>
                    new Promise((resolve) => {
                        try {
                            const req = indexedDB.deleteDatabase(name)
                            req.onsuccess = () => resolve()
                            req.onerror = () => resolve()
                            req.onblocked = () => resolve()
                        } catch {
                            resolve()
                        }
                    }),
            ),
        )
    }

    if (typeof caches !== 'undefined') {
        try {
            const keys = await caches.keys()
            await Promise.all(
                keys
                    .filter((k) => /deepthought|krikkit-deepthought|machine\.wasm|node\.gz/i.test(k))
                    .map((k) => caches.delete(k)),
            )
        } catch {
            /* ignore */
        }
    }

    try {
        window.localStorage?.setItem(LEGACY_IDB_RESET_KEY, '1')
    } catch {
        /* ignore */
    }
}

/**
 * @param {Record<string, string>|null|undefined} contents
 * @param {Iterable<string>} [knownPaths] paths that already exist in the guest (for partial patches)
 */
export function vfsContentsToFiles(contents, knownPaths = []) {
    /** @type {Record<string, string>} */
    const relative = {}
    if (contents && typeof contents === 'object') {
        for (const [raw, body] of Object.entries(contents)) {
            if (body == null) continue
            relative[normalizeVfsPath(raw)] = typeof body === 'string' ? body : String(body)
        }
    }
    if (relative['package.json']) {
        relative['package.json'] = normalizeLabPackageJson(relative['package.json']).body
    }
    const routed = normalizeGuestRouter(relative)
    const uiKit = normalizeGuestUiKit(routed)
    const imports = healUiImports(uiKit.files, knownPaths, { canonicalButton: CANONICAL_BUTTON })
    const healed = shimUninstallableBareImports(imports.files)
    /** @type {Record<string, string>} */
    const files = {}
    for (const [raw, body] of Object.entries(healed.files)) {
        const path = raw.startsWith('/') ? raw : `/${raw}`
        files[path] = maybePatchGuestConfig(path, body)
    }
    return files
}

export function getLabRuntime() {
    return engine
}

export function getPreviewPort() {
    return previewPort
}

export function getPreviewUrl() {
    if (previewUrl) return previewUrl
    if (previewPort != null && engine?.port) {
        try {
            return engine.port(previewPort) || null
        } catch {
            return null
        }
    }
    return null
}

export function onLabRuntimePort(fn) {
    portListeners.add(fn)
    if (previewPort != null) {
        try {
            fn({
                type: 'open',
                port: previewPort,
                url: getPreviewUrl(),
                replay: true,
            })
        } catch {
            /* ignore */
        }
    }
    return () => portListeners.delete(fn)
}

/**
 * @param {number} port
 * @param {string} [url]
 */
export function signalGuestListening(port, url) {
    const p = Number(port) | 0
    if (!p) return
    previewPort = p
    if (url) previewUrl = url
    else if (engine?.port) {
        try {
            previewUrl = engine.port(p) || null
        } catch {
            previewUrl = null
        }
    }
    for (const fn of portListeners) {
        try {
            fn({ type: 'open', port: p, url: previewUrl, source: 'signal' })
        } catch {
            /* ignore */
        }
    }
    try {
        window.dispatchEvent(
            new CustomEvent('krikkit-lab-runtime-listen', {
                detail: { port: p, url: previewUrl },
            }),
        )
    } catch {
        /* ignore */
    }
}

export function resolveGuestListenPort() {
    return previewPort
}

function emitPort(ev) {
    for (const fn of portListeners) {
        try {
            fn(ev)
        } catch {
            /* ignore */
        }
    }
}

/**
 * @param {{ files?: Record<string, string>, workdir?: string }} [opts]
 */
export function ensureLabSession(opts = {}) {
    if (engine) return Promise.resolve(engine)
    if (readyPromise) return readyPromise

    readyPromise = (async () => {
        await resetLegacyLabRuntimeCaches()
        await pinLabRuntimeHost()

        const files = vfsContentsToFiles(opts.files)
        const workdir = opts.workdir || '/'
        const pod = await LabRuntime.boot({
            files,
            workdir,
            // Bare `cd` / `~` follow $HOME. Engine default is /home/user (empty mock).
            env: {
                HOME: workdir,
                PWD: workdir,
                // In-memory history only — a VFS HISTFILE is watched by Vite (`page reload`).
                HISTFILE: '/dev/null',
            },
            swUrl: SW_URL,
            workerUrl: WORKER_URL,
            serviceWorker: true,
            watermark: false,
            preloadEsbuild: true,
            onServerReady: (port, url) => {
                signalGuestListening(port, url)
            },
        })

        engine = pod
        for (const stale of [
            '/tmp/.krikkit_history',
            '/.krikkit-lab_history',
            '/.deepthought_history',
            '/home/user/.krikkit-lab_history',
            '/home/user/.deepthought_history',
        ]) {
            try {
                await pod.fs.rm?.(stale)
            } catch {
                /* ignore */
            }
        }
        try {
            await pod.setPreviewScript(PREVIEW_CHROME_SCRIPT)
        } catch {
            /* chrome bridge is best-effort — preview still renders */
        }
        return pod
    })().catch((err) => {
        readyPromise = null
        engine = null
        throw err
    })

    return readyPromise
}

export async function destroyLabSession() {
    const pod = engine
    engine = null
    readyPromise = null
    previewPort = null
    previewUrl = null
    guestSyncedContent.clear()
    if (!pod) return
    try {
        await pod.teardown?.()
    } catch {
        /* ignore */
    }
}

/**
 * Write Lab editor buffers into the running pod VFS.
 * Unchanged config/lock files are skipped (mtime bumps restart Vite in a loop).
 * Source files may be rewritten on `{ force: true }` so the in-memory watcher
 * fires — Vite's transform cache otherwise keeps serving the previous module
 * after an iframe remount, and only a full Lab reload looked "fixed".
 *
 * @param {Record<string, string>} patch
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{ wrote: number, needsRestart: boolean, needsReload: boolean }>}
 */
export async function syncLabVfsToGuest(patch, options = {}) {
    const force = Boolean(options.force)
    const empty = { wrote: 0, needsRestart: false, needsReload: false }
    const pod = engine
    if (!pod?.fs?.writeFile) return empty
    await purgeGuestCustomRouterFiles(pod)
    const healedPatch = applyComponentStubHeal(patch)
    // Partial patches can't see the whole project — already-synced guest paths
    // stand in as the "exists" set so `ui/<x>` rewrites stay deterministic.
    const files = vfsContentsToFiles(healedPatch, guestSyncedContent.keys())
    if (projectUsesButtonAsChild(patch) && CANONICAL_BUTTON) {
        files['/src/components/ui/button.jsx'] = CANONICAL_BUTTON
    }
    let needsReload = false
    let needsRestart = false
    let wrote = 0
    for (const [path, raw] of Object.entries(files)) {
        if (shouldSkipGuestSyncPath(path)) continue
        const rel = path.replace(/^\/+/, '')
        if (isCustomRouterFile(rel)) continue
        const data = maybePatchGuestConfig(path, raw)
        const cached = guestSyncedContent.get(path) === data
        const sensitive = guestWriteRestartsDev(path) || guestWriteNeedsReload(path)

        try {
            let guestMatches = cached
            if (! guestMatches) {
                try {
                    const existing = await pod.fs.readFile(path, 'utf8')
                    const text = typeof existing === 'string' ? existing : String(existing ?? '')
                    guestMatches = text === data
                    if (guestMatches) guestSyncedContent.set(path, data)
                } catch {
                    guestMatches = false
                }
            }

            // Matching config must not be touched. Matching source is rewritten
            // only on force so Vite's watcher invalidates the transform cache.
            if (guestMatches && (! force || sensitive)) {
                continue
            }

            const dir = path.slice(0, path.lastIndexOf('/')) || '/'
            if (dir && dir !== '/') {
                try {
                    await pod.fs.mkdir(dir, { recursive: true })
                } catch {
                    /* exists */
                }
            }
            await pod.fs.writeFile(path, data)
            guestSyncedContent.set(path, data)
            wrote += 1
            if (guestWriteRestartsDev(path)) needsRestart = true
            else if (guestWriteNeedsReload(path)) needsReload = true
        } catch (err) {
            console.warn('[lab] fs.writeFile failed', path, err)
        }
    }

    // Config/index.html restarts Vite — wait for vite-ready. Immediate remount
    // hits an empty shell and chrome sticks on "running" until a Lab reload.
    if (! needsRestart && needsReload) {
        schedulePreviewResync('guest-reload', 400)
    }

    return { wrote, needsRestart, needsReload }
}

/**
 * Re-write every synced stylesheet (same content, fresh mtime) AFTER source
 * files landed. Tailwind v4's Vite plugin regenerates utilities when the CSS
 * module is invalidated — doing it last guarantees the scan sees every JSX
 * file this turn created, so no class ships unstyled.
 *
 * @param {string[]} [touchedPaths] source paths written this turn
 */
export async function retouchGuestStyles(touchedPaths = []) {
    const pod = engine
    if (! pod?.fs?.writeFile) return
    const touchedSource = touchedPaths.some((p) => /\.(jsx?|tsx?|mdx?|html|vue|svelte)$/i.test(String(p || '')))
    if (! touchedSource) return
    for (const [path, data] of guestSyncedContent.entries()) {
        if (! /\.css$/i.test(path) || SKIP_SYNC_RE.test(path)) continue
        try {
            await pod.fs.writeFile(path, data)
        } catch {
            /* stylesheet retouch is best-effort */
        }
    }
}

/**
 * End-of-turn preview commit for AI-written files, in a strict order:
 * 1. soft-sync the full workspace, 2. force-rewrite the touched modules so
 * Vite's transform cache invalidates, 3. retouch stylesheets last so Tailwind
 * regenerates with every new file in view, 4. remount only after the dev
 * server goes quiet. The remounted page must never load a stylesheet built
 * before this turn's files existed.
 *
 * @param {{ contents?: Record<string, string>, touchedPaths?: string[], reason?: string }} args
 */
export async function commitLabAiChanges({ contents = {}, touchedPaths = [], reason = 'ai-commit' } = {}) {
    const healedContents = applyComponentStubHeal(contents)
    const full = await syncLabVfsToGuest(healedContents)

    const touched = {}
    for (const path of touchedPaths) {
        if (healedContents[path] != null) touched[path] = healedContents[path]
    }
    const forced = Object.keys(touched).length
        ? await syncLabVfsToGuest(touched, { force: true })
        : { wrote: 0, needsRestart: false, needsReload: false }

    if (full.needsRestart || forced.needsRestart) {
        // Vite is restarting — the autostart vite-ready hook remounts; the
        // fallback covers a restart that never signals ready.
        schedulePreviewResyncFallback(reason, 12_000)
        return forced
    }

    await retouchGuestStyles(touchedPaths)
    await waitForGuestDevQuiet({ quietMs: 350, maxWaitMs: 4_000 })
    schedulePreviewResync(reason, 120)
    return forced
}

/**
 * Push Lab buffers into the guest and remount Preview.
 * Force-rewrites source so Vite cannot keep a stale module graph.
 *
 * @param {Record<string, string>} patch
 * @param {string} [reason]
 */
export async function pushLabPreview(patch, reason = 'lab') {
    const result = await syncLabVfsToGuest(patch, { force: true })
    if (result.needsRestart) return result
    schedulePreviewResync(reason, 420)
    return result
}

/**
 * Attach the Lab runtime interactive shell to an xterm host element.
 * @param {HTMLElement} host
 * @param {{ Terminal: any, FitAddon: any }} xterm
 */
export async function attachLabTerminal(host, xterm, opts = {}) {
    const pod = await ensureLabSession()
    if (typeof pod.createTerminal !== 'function') {
        throw new Error('LabRuntime.createTerminal unavailable')
    }
    const terminal = pod.createTerminal({
        Terminal: xterm.Terminal,
        FitAddon: xterm.FitAddon,
        theme: opts.theme,
        autoPrompt: opts.autoPrompt !== false,
        prompt: opts.prompt || ((cwd) => `\x1b[36mlab\x1b[0m:\x1b[34m${cwd}\x1b[0m$ `),
    })
    terminal.attach(host)
    return { pod, terminal }
}

/** @deprecated RV64-era helpers — kept as no-ops / thin shims for old call sites */
export function detectLabFramework() {
    return { kind: 'node', label: 'Node' }
}

export async function prepareGuestCompiledPreview() {
    return { ok: false, error: 'host-compile removed; use npm run dev in the Lab shell' }
}

export async function prepareGuestStaticPreview() {
    return { ok: false, argv: null, fileCount: 0, hadIndex: false }
}

export async function runGuestNode() {
    throw new Error('runGuestNode removed — use Lab shell (npm run dev / node …)')
}

export function interruptGuest() {
    /* createTerminal handles Ctrl+C */
}

export function writeGuestStdin() {
    /* createTerminal owns stdin */
}

export async function fetchGuestPreview(path = '/', { port } = {}) {
    const pod = engine
    const p = port || previewPort
    if (!pod || !p) throw new Error('no preview port')
    if (typeof pod.request === 'function') {
        return pod.request(p, { path })
    }
    if (pod.proxy?.handleRequest) {
        const res = await pod.proxy.handleRequest(p, 'GET', path, {})
        return {
            status: res.status || 200,
            body: res.body?.toString?.() ?? String(res.body ?? ''),
        }
    }
    throw new Error('preview request API unavailable')
}

/** @deprecated Use getLabRuntime */
export const getDeepThoughtEngine = getLabRuntime
/** @deprecated Use ensureLabSession */
export const ensureDeepThoughtSession = ensureLabSession
/** @deprecated Use destroyLabSession */
export const destroyDeepThoughtSession = destroyLabSession
/** @deprecated Use onLabRuntimePort */
export const onDeepThoughtPort = onLabRuntimePort
/** @deprecated Use resetLegacyLabRuntimeCaches */
export const resetLegacyDeepThoughtCaches = resetLegacyLabRuntimeCaches
/** @deprecated Use attachLabTerminal */
export const attachDeepThoughtTerminal = attachLabTerminal
