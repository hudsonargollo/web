/**
 * Seed guest VFS with native WASM binaries that npm extract skipped.
 *
 * Not Tailwind CSS CDN / @tailwindcss/browser. Guest Vite still compiles
 * with @tailwindcss/vite; this only fetches the missing lightningcss / oxide
 * .wasm files from the npm registry mirror so the plugin can load.
 *
 * npm skips `@tailwindcss/oxide-wasm32-wasi` (`cpu: wasm32`) and never
 * installs `lightningcss-wasm` (not an optionalDependency of lightningcss).
 * Those packages must be installed or fetched even when their dirs are absent.
 */

const JSDELIVR = 'https://cdn.jsdelivr.net/npm'
const MIN_WASM_BYTES = 64
const MIN_GLUE_BYTES = 8

/** Parent CSS compiler packages → WASM companions Vite needs in the guest pod. */
export const COMPILER_WASM_COMPANIONS = [
    {
        parent: 'lightningcss',
        packageName: 'lightningcss-wasm',
        wasmFiles: ['lightningcss_node.wasm'],
        glueFiles: [
            'package.json',
            'wasm-node.cjs',
            'index.cjs',
            'node_modules/napi-wasm/package.json',
            'node_modules/napi-wasm/index.js',
        ],
    },
    {
        parent: '@tailwindcss/oxide',
        packageName: '@tailwindcss/oxide-wasm32-wasi',
        wasmFiles: ['tailwindcss-oxide.wasm32-wasi.wasm'],
        glueFiles: [
            'package.json',
            'tailwindcss-oxide.wasi.cjs',
            'wasi-worker.mjs',
        ],
    },
]

/**
 * @param {string} pkgName
 */
export function isNativeWasmPackageName(pkgName) {
    const name = String(pkgName || '')
    return (
        name.endsWith('-wasm') ||
        name.includes('wasm32-wasi') ||
        name.includes('-wasm32-')
    )
}

/**
 * @param {string} packageName
 */
export function wasmPackageDir(packageName) {
    return `/node_modules/${String(packageName || '').replace(/^\/+/, '')}`
}

/**
 * @param {Record<string, string>} parentVersions
 */
export function compilerWasmSpecsFromParents(parentVersions) {
    const versions = parentVersions && typeof parentVersions === 'object' ? parentVersions : {}
    const specs = []
    for (const companion of COMPILER_WASM_COMPANIONS) {
        const version = String(versions[companion.parent] || '').trim()
        if (!version) continue
        specs.push({ ...companion, version })
    }
    return specs
}

/**
 * @param {string} pkgName
 * @returns {string[]}
 */
export function defaultWasmFilesForPackage(pkgName) {
    const name = String(pkgName || '')
    const companion = COMPILER_WASM_COMPANIONS.find((item) => item.packageName === name)
    return companion ? companion.wasmFiles.slice() : []
}

/**
 * @param {string[]} fileNames
 * @returns {string[]}
 */
export function wasmAssetsFromPackageListing(fileNames) {
    const names = Array.isArray(fileNames) ? fileNames.map(String) : []
    const assets = new Set()
    for (const name of names) {
        if (/\.debug\.wasm$/i.test(name)) continue
        if (/\.wasm$/i.test(name)) {
            assets.add(name)
            continue
        }
        const stem = name.replace(/\.(js|cjs|mjs)$/i, '')
        if (stem === name) continue
        if (/wasi-worker/i.test(stem)) continue
        if (
            /lightningcss_node$/i.test(stem) ||
            /wasm32-wasi$/i.test(stem)
        ) {
            assets.add(`${stem}.wasm`)
        }
    }
    return [...assets]
}

/**
 * @param {string} pkgName
 * @param {string} fileName
 * @returns {string[]}
 */
export function wasmAliasPaths(pkgName, fileName) {
    const aliases = []
    if (pkgName === 'lightningcss-wasm') {
        aliases.push(`/lightningcss-wasm/${fileName}`)
    }
    return aliases
}

/**
 * @param {string} dir
 */
export function packageNameFromDir(dir) {
    const stripped = String(dir || '').replace(/\/+$/, '').replace(/^\/node_modules\//, '')
    const nested = stripped.lastIndexOf('/node_modules/')
    return nested === -1 ? stripped : stripped.slice(nested + '/node_modules/'.length)
}

/**
 * @param {any} pod
 * @param {string} dir
 */
async function readdirSafe(pod, dir) {
    try {
        const entries = await pod.fs.readdir(dir)
        return Array.isArray(entries) ? entries.map(String) : []
    } catch {
        return []
    }
}

/**
 * @param {any} pod
 * @param {string} path
 */
async function readJsonSafe(pod, path) {
    try {
        const raw = await pod.fs.readFile(path, 'utf8')
        return JSON.parse(typeof raw === 'string' ? raw : String(raw))
    } catch {
        return null
    }
}

/**
 * @param {any} pod
 * @param {string} path
 * @param {number} [minBytes]
 */
async function fileMissing(pod, path, minBytes = MIN_GLUE_BYTES) {
    try {
        const st = await pod.fs.stat(path)
        return !st || Number(st.size) < minBytes
    } catch {
        return true
    }
}

/**
 * @param {any} pod
 * @param {string} path
 */
async function wasmMissing(pod, path) {
    return fileMissing(pod, path, MIN_WASM_BYTES)
}

/**
 * @param {any} pod
 */
export async function listGuestWasmPackageDirs(pod) {
    /** @type {string[]} */
    const dirs = []
    const seen = new Set()
    const push = (dir) => {
        const key = String(dir || '').replace(/\/+$/, '') || '/'
        if (!key.startsWith('/node_modules/')) return
        if (seen.has(key)) return
        seen.add(key)
        dirs.push(key)
    }

    const top = await readdirSafe(pod, '/node_modules')
    for (const name of top) {
        if (name.startsWith('@')) {
            const scoped = await readdirSafe(pod, `/node_modules/${name}`)
            for (const child of scoped) {
                const dir = `/node_modules/${name}/${child}`
                if (isNativeWasmPackageName(`${name}/${child}`)) push(dir)
                const nestedTop = await readdirSafe(pod, `${dir}/node_modules`)
                for (const nested of nestedTop) {
                    if (nested.startsWith('@')) {
                        const nestedScoped = await readdirSafe(pod, `${dir}/node_modules/${nested}`)
                        for (const nestedChild of nestedScoped) {
                            if (isNativeWasmPackageName(`${nested}/${nestedChild}`)) {
                                push(`${dir}/node_modules/${nested}/${nestedChild}`)
                            }
                        }
                    } else if (isNativeWasmPackageName(nested)) {
                        push(`${dir}/node_modules/${nested}`)
                    }
                }
            }
            continue
        }
        if (isNativeWasmPackageName(name)) push(`/node_modules/${name}`)
    }
    return dirs
}

/**
 * @param {any} pod
 * @returns {Promise<Record<string, string>>}
 */
export async function readCompilerParentVersions(pod) {
    /** @type {Record<string, string>} */
    const versions = {}
    for (const companion of COMPILER_WASM_COMPANIONS) {
        const pkg = await readJsonSafe(pod, `${wasmPackageDir(companion.parent)}/package.json`)
        const version = String(pkg?.version || '').trim()
        if (version) versions[companion.parent] = version
    }
    return versions
}

/**
 * @param {string} url
 * @param {{ wasm?: boolean }} [opts]
 * @returns {Promise<Uint8Array|null>}
 */
async function fetchCdnBytes(url, opts = {}) {
    if (typeof fetch !== 'function') return null
    try {
        const resp = await fetch(url)
        if (!resp.ok) return null
        const buf = new Uint8Array(await resp.arrayBuffer())
        if (buf.byteLength < (opts.wasm ? MIN_WASM_BYTES : MIN_GLUE_BYTES)) return null
        if (opts.wasm && (buf[0] !== 0x00 || buf[1] !== 0x61 || buf[2] !== 0x73 || buf[3] !== 0x6d)) {
            return null
        }
        return buf
    } catch {
        return null
    }
}

/**
 * @param {string} url
 * @returns {Promise<Uint8Array|null>}
 */
async function fetchWasmBytes(url) {
    return fetchCdnBytes(url, { wasm: true })
}

/**
 * @param {any} pod
 * @param {string} path
 * @param {Uint8Array} bytes
 */
async function writeBytes(pod, path, bytes) {
    const dir = path.slice(0, path.lastIndexOf('/')) || '/'
    try {
        await pod.fs.mkdir?.(dir, { recursive: true })
    } catch {
        /* parent may already exist */
    }
    await pod.fs.writeFile(path, bytes)
}

/**
 * @param {any} pod
 * @param {{ packageName: string, version: string, wasmFiles: string[] }} spec
 */
async function compilerCompanionReady(pod, spec) {
    const dir = wasmPackageDir(spec.packageName)
    if (await fileMissing(pod, `${dir}/package.json`)) return false
    const files = spec.wasmFiles.length ? spec.wasmFiles : defaultWasmFilesForPackage(spec.packageName)
    if (!files.length) return false
    for (const fileName of files) {
        if (await wasmMissing(pod, `${dir}/${fileName}`)) return false
    }
    return true
}

/**
 * @param {any} pod
 * @param {ReturnType<typeof compilerWasmSpecsFromParents>[number]} spec
 */
async function installCompilerCompanion(pod, spec) {
    const installer = pod.packages
    if (typeof installer?.install !== 'function') return false
    try {
        await installer.install(spec.packageName, spec.version, {
            withDevDeps: false,
            transformModules: false,
        })
        return true
    } catch {
        return false
    }
}

/**
 * @param {any} pod
 * @param {ReturnType<typeof compilerWasmSpecsFromParents>[number]} spec
 */
async function seedCompanionGlue(pod, spec) {
    let seeded = 0
    const dir = wasmPackageDir(spec.packageName)
    const glue = Array.isArray(spec.glueFiles) ? spec.glueFiles : []
    for (const fileName of glue) {
        const dest = `${dir}/${fileName}`
        if (!await fileMissing(pod, dest)) continue
        const bytes = await fetchCdnBytes(
            `${JSDELIVR}/${spec.packageName}@${spec.version}/${fileName}`,
        )
        if (!bytes) continue
        await writeBytes(pod, dest, bytes)
        seeded += 1
    }
    return seeded
}

/**
 * @param {any} pod
 * @param {string} dir
 * @param {string} pkgName
 * @param {string} version
 * @param {string[]} assets
 */
async function seedWasmAssets(pod, dir, pkgName, version, assets) {
    let seeded = 0
    for (const fileName of assets) {
        const dest = `${dir}/${fileName}`
        const wantDebug = /wasm32-wasi/i.test(fileName) || /wasm32-wasi/i.test(pkgName)
        const debugDest = dest.replace(/\.wasm$/i, '.debug.wasm')
        const needRelease = await wasmMissing(pod, dest)
        const needDebug = wantDebug && await wasmMissing(pod, debugDest)
        if (!needRelease && !needDebug) {
            for (const alias of wasmAliasPaths(pkgName, fileName)) {
                if (await wasmMissing(pod, alias)) {
                    try {
                        const existing = await pod.fs.readFile(dest)
                        await writeBytes(pod, alias, existing)
                        seeded += 1
                    } catch {
                        /* ignore */
                    }
                }
            }
            continue
        }

        const cdnFile = fileName.replace(/\.debug\.wasm$/i, '.wasm')
        const bytes = await fetchWasmBytes(
            `${JSDELIVR}/${pkgName}@${version}/${cdnFile}`,
        )
        if (!bytes) continue

        if (needRelease) {
            await writeBytes(pod, dest, bytes)
            seeded += 1
        }
        if (needDebug) {
            await writeBytes(pod, debugDest, bytes)
            seeded += 1
        }
        for (const alias of wasmAliasPaths(pkgName, fileName)) {
            if (await wasmMissing(pod, alias)) {
                await writeBytes(pod, alias, bytes)
                seeded += 1
            }
        }
    }
    return seeded
}

/**
 * @param {any} pod
 * @returns {Promise<number>} seeded file count
 */
export async function seedGuestNativeWasm(pod) {
    if (!pod?.fs?.writeFile || !pod.fs.readdir) return 0

    const specs = compilerWasmSpecsFromParents(await readCompilerParentVersions(pod))
    let seeded = 0

    for (const spec of specs) {
        if (await compilerCompanionReady(pod, spec)) continue
        if (await installCompilerCompanion(pod, spec)) {
            seeded += 1
        }
        seeded += await seedCompanionGlue(pod, spec)
    }

    const dirs = new Set(await listGuestWasmPackageDirs(pod))
    for (const spec of specs) {
        dirs.add(wasmPackageDir(spec.packageName))
    }

    for (const dir of dirs) {
        const pkg = await readJsonSafe(pod, `${dir}/package.json`)
        const pkgName = String(pkg?.name || packageNameFromDir(dir))
        const spec = specs.find((item) => item.packageName === pkgName)
        const version = String(pkg?.version || spec?.version || 'latest')
        const files = await readdirSafe(pod, dir)
        const assets = new Set(wasmAssetsFromPackageListing(files))
        for (const fileName of defaultWasmFilesForPackage(pkgName)) {
            assets.add(fileName)
        }
        if (!assets.size) continue
        seeded += await seedWasmAssets(pod, dir, pkgName, version, [...assets])
    }

    return seeded
}
