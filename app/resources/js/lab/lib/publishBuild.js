import { zipSync } from 'fflate'
import { getLabRuntime } from './labRuntime'
import { pauseLabDevServerForPublish, prepareLabGuestForBuild } from './labAutostart'
import { resolveEsbuildPublishPlan, writeEsbuildPublishScript } from './publishEsbuild'
import { resumeLabMemoryAfterPublish, sleepMs, suspendLabMemoryForPublish } from './publishMemory'

const DIST_FOLDERS = ['dist', 'build', 'out']
const SKIP_INDEX_SEARCH = /(?:^|\/)(node_modules|\.git|\.next|\.vite|\.npm|\.cache)(?:\/|$)/i
const SKIP_ZIP_PATH = /(?:^|\/)(node_modules|\.git|\.next|\.vite|\.npm|\.cache|src|public)(?:\/|$)/i
const SOURCE_ROOT_MARKERS = ['package.json', 'vite.config.js', 'vite.config.ts', 'vite.config.mjs', 'vite.config.cjs']
const MAX_ZIP_BYTES = 50 * 1024 * 1024
const MAX_ZIP_FILES = 5000

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
 * @param {any} pod
 * @param {string} path
 */
async function fileExists(pod, path) {
    if (typeof pod.fs.exists === 'function') {
        return pod.fs.exists(path)
    }
    try {
        await pod.fs.readFile(path)
        return true
    } catch {
        return false
    }
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
 * @param {any} pod
 */
async function resolveViteConfigFile(pod) {
    for (const file of ['/vite.config.js', '/vite.config.ts', '/vite.config.mjs', '/vite.config.cjs']) {
        if (await fileExists(pod, file)) return file
    }
    return '/vite.config.js'
}

/**
 * Production roots must be build output — never the project source tree.
 *
 * @param {any} pod
 * @param {string} root
 */
async function isPublishOutputRoot(pod, root) {
    const normalized = root.replace(/\/+$/, '') || '/'
    if (! normalized || normalized === '/' || normalized === '/src' || normalized.startsWith('/src/')) {
        return false
    }

    if (! (await fileExists(pod, `${normalized}/index.html`))) {
        return false
    }

    for (const marker of SOURCE_ROOT_MARKERS) {
        if (await fileExists(pod, `/${marker}`) && normalized === '/') {
            return false
        }
    }

    return true
}

/**
 * @param {any} pod
 */
async function resolveBuildPlan(pod, pkg) {
    const esbuildPlan = await resolveEsbuildPublishPlan(pod)
    if (esbuildPlan) return esbuildPlan

    const scripts = pkg?.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {}
    const buildScript = typeof scripts.build === 'string' ? scripts.build.trim() : ''
    const viteMajor = await viteMajorVersion(pod)
    const viteLoaderArgs = viteMajor >= 6 ? ['--configLoader', 'native'] : []

    if (await fileExists(pod, '/node_modules/vite/package.json')) {
        return {
            mode: 'programmatic',
            label: 'vite build',
            viteMajor,
            configFile: await resolveViteConfigFile(pod),
        }
    }

    if (buildScript) {
        if (/\bvite\b/i.test(buildScript) && viteLoaderArgs.length) {
            return { mode: 'spawn', cmd: 'npm', args: ['run', 'build', '--', ...viteLoaderArgs], label: 'npm run build' }
        }
        return { mode: 'spawn', cmd: 'npm', args: ['run', 'build'], label: 'npm run build' }
    }

    return null
}

/**
 * @param {any} pod
 * @param {{ configFile: string, viteMajor: number }} plan
 */
async function writeProgrammaticViteBuildScript(pod, plan) {
    const loaderLine = plan.viteMajor >= 6 ? "  configLoader: 'native',\n" : ''
    const script = [
        "import { build } from 'vite'",
        'await build({',
        `  configFile: '${plan.configFile}',`,
        loaderLine,
        "  logLevel: 'warn',",
        '  build: {',
        '    sourcemap: false,',
        '    reportCompressedSize: false,',
        '    cssCodeSplit: true,',
        '  },',
        '})',
        '',
    ].join('\n')
    await pod.fs.writeFile('/.__krikkit_publish_build__.mjs', script)
}

async function clearGuestBuildCaches(pod) {
    for (const path of ['/.vite', '/node_modules/.vite', '/.next/cache']) {
        try {
            await pod.fs.rm(path, { recursive: true, force: true })
        } catch {
            /* ignore */
        }
    }
}

/**
 * @param {any} pod
 */
async function readViteOutDir(pod) {
    const files = ['/vite.config.js', '/vite.config.ts', '/vite.config.mjs', '/vite.config.cjs']
    for (const file of files) {
        try {
            const raw = await pod.fs.readFile(file, 'utf8')
            const text = typeof raw === 'string' ? raw : String(raw)
            const match = text.match(/outDir\s*:\s*['"`]([^'"`]+)['"`]/)
            if (match?.[1]) {
                const value = match[1].trim()
                return value.startsWith('/') ? value.replace(/\/+/g, '/') : `/${value}`.replace(/\/+/g, '/')
            }
        } catch {
            /* no config */
        }
    }
    return null
}

/**
 * @param {any} pod
 * @param {string} dir
 * @param {number} depth
 * @param {number} maxDepth
 */
async function findIndexHtmlRoot(pod, dir, depth, maxDepth) {
    if (depth > maxDepth || SKIP_INDEX_SEARCH.test(dir)) return null

    const normalized = dir.replace(/\/+$/, '') || '/'
    const indexPath = normalized === '/' ? '/index.html' : `${normalized}/index.html`
    if (await fileExists(pod, indexPath)) {
        return normalized
    }

    let names = []
    try {
        names = await pod.fs.readdir(normalized)
    } catch {
        return null
    }
    if (! Array.isArray(names)) return null

    for (const name of names) {
        if (! name || name === '.' || name === '..') continue
        const full = normalized === '/' ? `/${name}` : `${normalized}/${name}`
        if (SKIP_INDEX_SEARCH.test(full)) continue

        let isDir = false
        try {
            const st = await pod.fs.stat(full)
            isDir = Boolean(st?.isDirectory)
        } catch {
            try {
                const children = await pod.fs.readdir(full)
                isDir = Array.isArray(children)
            } catch {
                isDir = false
            }
        }
        if (! isDir) continue

        const found = await findIndexHtmlRoot(pod, full, depth + 1, maxDepth)
        if (found) return found
    }

    return null
}

/**
 * @param {any} pod
 */
async function findDistRootOnce(pod) {
    const customOut = await readViteOutDir(pod)
    const candidates = [...new Set([
        ...(customOut ? [customOut] : []),
        ...DIST_FOLDERS.map((folder) => `/${folder}`),
    ])]

    for (const root of candidates) {
        if (await isPublishOutputRoot(pod, root)) {
            return root
        }
        const nested = await findIndexHtmlRoot(pod, root, 0, 3)
        if (nested && await isPublishOutputRoot(pod, nested)) {
            return nested
        }
    }

    return null
}

/**
 * Worker VFS writes can land on the host volume slightly after the build exits.
 *
 * @param {any} pod
 * @param {{ signal?: AbortSignal, onLog?: (line: string) => void, timeoutMs?: number }} [opts]
 */
async function waitForDistRoot(pod, opts = {}) {
    const timeoutMs = opts.timeoutMs ?? 30_000
    const started = Date.now()
    let lastListing = ''

    while (Date.now() - started < timeoutMs) {
        if (opts.signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError')
        }

        const root = await findDistRootOnce(pod)
        if (root) {
            opts.onLog?.(`Found production output in ${root.replace(/^\//, '')}/`)
            return root
        }

        try {
            const names = await pod.fs.readdir('/')
            lastListing = Array.isArray(names) ? names.join(', ') : ''
        } catch {
            lastListing = ''
        }

        await sleep(Math.min(300, 80 + Math.floor((Date.now() - started) / 40)), opts.signal)
    }

    throw new Error(
        lastListing
            ? `Build finished but no dist/ folder with index.html was found. Root entries: ${lastListing}. Check the build log for errors.`
            : 'Build finished but no dist/ folder with index.html was found. Check the build log for errors.',
    )
}

/**
 * @param {any} pod
 * @param {string} dirPath
 * @param {string} prefix
 * @param {Record<string, Uint8Array>} out
 */
async function walkGuestDirectory(pod, dirPath, prefix, out) {
    if (SKIP_ZIP_PATH.test(dirPath)) return

    const names = await pod.fs.readdir(dirPath)
    if (! Array.isArray(names)) return

    for (const name of names) {
        if (! name || name === '.' || name === '..') continue
        const full = `${dirPath}/${name}`.replace(/\/+/g, '/')
        if (SKIP_ZIP_PATH.test(full)) continue
        const rel = prefix ? `${prefix}/${name}` : name
        let isDir = false
        try {
            const st = await pod.fs.stat(full)
            isDir = Boolean(st?.isDirectory)
        } catch {
            try {
                const children = await pod.fs.readdir(full)
                isDir = Array.isArray(children)
            } catch {
                isDir = false
            }
        }

        if (isDir) {
            await walkGuestDirectory(pod, full, rel, out)
            continue
        }

        if (Object.keys(out).length >= MAX_ZIP_FILES) {
            throw new Error(`The production build contains more than ${MAX_ZIP_FILES} files. Remove unused assets and try again.`)
        }

        const data = await pod.fs.readFile(full)
        out[rel.replace(/\\/g, '/')] = data instanceof Uint8Array
            ? data
            : new TextEncoder().encode(String(data))
    }
}

/**
 * @param {any} pod
 * @param {string} rootPath
 */
async function zipGuestDirectory(pod, rootPath) {
    const files = {}
    await walkGuestDirectory(pod, rootPath, '', files)
    if (! Object.keys(files).length) {
        throw new Error('The production build folder is empty.')
    }

    const zipped = zipSync(files, { level: 1 })
    return new Blob([zipped], { type: 'application/zip' })
}

async function clearPreviousDist(pod) {
    for (const folder of DIST_FOLDERS) {
        try {
            await pod.fs.rm(`/${folder}`, { recursive: true, force: true })
        } catch {
            /* ignore */
        }
    }
}

/**
 * Build a production artifact in the browser and return a zip of dist/.
 *
 * @param {{
 *   getFiles?: () => Record<string, string>,
 *   onPhase?: (phase: string, detail?: any) => void,
 *   onLog?: (line: string) => void,
 *   signal?: AbortSignal,
 * }} opts
 */
export async function buildLabPublishArtifact(opts = {}) {
    const onPhase = typeof opts.onPhase === 'function' ? opts.onPhase : () => {}
    const note = (line) => {
        if (typeof opts.onLog === 'function') opts.onLog(line)
    }

    suspendLabMemoryForPublish()
    note('Publish build started.')
    pauseLabDevServerForPublish()
    note('Preview paused to free memory.')
    await sleepMs(350)

    try {
        const { pod, pkg } = await prepareLabGuestForBuild({
            getFiles: opts.getFiles,
            onPhase,
            onLog: opts.onLog,
            signal: opts.signal,
            light: true,
        })

        if (! getLabRuntime()) {
            throw new Error('Lab runtime is not ready.')
        }

        await clearPreviousDist(pod)
        await clearGuestBuildCaches(pod)

        const buildPlan = await resolveBuildPlan(pod, pkg)
        if (! buildPlan) {
            throw new Error('This project has no build script. Add "build": "vite build" to package.json.')
        }

        onPhase('build', { label: buildPlan.label })
        note(`Running ${buildPlan.label}…`)

        const logLines = []
        const pushLog = (chunk) => {
            const text = String(chunk || '').replace(/\r/g, '')
            if (! text.trim()) return
            for (const line of text.split('\n')) {
                const trimmed = line.trim()
                if (! trimmed) continue
                logLines.push(trimmed)
                if (logLines.length > 120) logLines.shift()
                opts.onLog?.(trimmed)
            }
        }

        const buildStarted = Date.now()
        let proc
        if (buildPlan.mode === 'esbuild') {
            await writeEsbuildPublishScript(pod, buildPlan)
            proc = await pod.spawn('node', ['.__krikkit_esbuild_publish__.mjs'], {
                cwd: '/',
                signal: opts.signal,
                env: {
                    CI: 'true',
                    NODE_ENV: 'production',
                    npm_config_update_notifier: 'false',
                },
            })
        } else if (buildPlan.mode === 'programmatic') {
            await writeProgrammaticViteBuildScript(pod, buildPlan)
            proc = await pod.spawn('node', ['.__krikkit_publish_build__.mjs'], {
                cwd: '/',
                signal: opts.signal,
                env: {
                    CI: 'true',
                    NODE_ENV: 'production',
                    npm_config_update_notifier: 'false',
                },
            })
        } else {
            proc = await pod.spawn(buildPlan.cmd, buildPlan.args, {
                cwd: '/',
                signal: opts.signal,
                env: {
                    CI: 'true',
                    NODE_ENV: 'production',
                    npm_config_update_notifier: 'false',
                },
            })
        }

        proc.on?.('output', pushLog)
        proc.on?.('error', pushLog)

        const result = await proc.completion
        const buildMs = Date.now() - buildStarted
        note(`Build exited with code ${result?.exitCode ?? 1} (${buildMs}ms).`)

        if ((result?.exitCode ?? 1) !== 0) {
            const tail = String(result?.stderr || result?.stdout || '').trim()
            const message = tail
                ? `Production build failed.\n${tail.slice(-1200)}`
                : 'Production build failed.'
            throw new Error(message)
        }

        if (buildMs < 200 && logLines.length === 0) {
            const tail = String(result?.stderr || result?.stdout || '').trim()
            if (tail) note(tail)
        }

        try {
            await pod.fs.rm('/.__krikkit_publish_build__.mjs', { force: true })
        } catch {
            /* ignore */
        }
        try {
            await pod.fs.rm('/.__krikkit_esbuild_publish__.mjs', { force: true })
        } catch {
            /* ignore */
        }
        try {
            await pod.fs.rm('/.__krikkit_publish_entry__.jsx', { force: true })
        } catch {
            /* ignore */
        }
        try {
            await pod.fs.rm('/src/.__krikkit_publish_entry__.jsx', { force: true })
        } catch {
            /* ignore */
        }

        onPhase('pack')
        note('Waiting for build output…')
        const distRoot = await waitForDistRoot(pod, { signal: opts.signal, onLog: note })
        if (! await isPublishOutputRoot(pod, distRoot)) {
            throw new Error('The production build folder looks invalid. Expected dist/index.html, not project source files.')
        }
        const blob = await zipGuestDirectory(pod, distRoot)
        if (blob.size > MAX_ZIP_BYTES) {
            throw new Error(`The production build is too large to upload (${formatBytes(blob.size)}). Remove unused assets or raise LAB_PUBLISH_ARTIFACT_MAX_BYTES on the server.`)
        }
        note(`Packaged ${formatBytes(blob.size)} from ${distRoot.replace(/^\//, '')}/`)
        onPhase('pack-done', { bytes: blob.size })

        return blob
    } finally {
        resumeLabMemoryAfterPublish()
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
