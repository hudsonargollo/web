/**
 * Rewrite relative `ui/<name>` imports that resolve to a missing module when
 * that module actually lives under `src/components/ui/`. Models regularly
 * write `import Button from './ui/button'` inside `src/pages/*.jsx`; Vite
 * resolves it to `src/pages/ui/button`, errors, and the preview remount
 * retries the same broken module — an endless error → reload loop.
 */

const CODE_FILE_RE = /\.(?:jsx?|tsx?)$/i
const PROBE_EXTS = ['', '.jsx', '.tsx', '.js', '.ts', '/index.jsx', '/index.tsx', '/index.js', '/index.ts']
// from '…' | import '…' | import('…') | require('…') — relative specs only.
const SPEC_RE = /((?:\bfrom|\bimport|\brequire)\s*\(?\s*)(['"])(\.{1,2}\/[^'"\n]+)\2/g
const UI_TAIL_RE = /(?:^|\/)ui\/([\w$][\w$.-]*)$/
const UI_HOME_DIR = 'src/components/ui'
const BUTTON_PATH = `${UI_HOME_DIR}/button.jsx`

function stripSlashes(path) {
    return String(path || '').replace(/^\/+/, '')
}

function dirOf(path) {
    const at = path.lastIndexOf('/')
    return at <= 0 ? '' : path.slice(0, at)
}

/** Forward-slash join + `.`/`..` collapse; null when the spec escapes the root. */
function resolveSpec(fromDir, spec) {
    const parts = fromDir ? fromDir.split('/') : []
    for (const seg of String(spec).split('/')) {
        if (seg === '' || seg === '.') continue
        if (seg === '..') {
            if (! parts.length) return null
            parts.pop()
            continue
        }
        parts.push(seg)
    }
    return parts.join('/')
}

function relativeSpec(fromDir, target) {
    const from = fromDir ? fromDir.split('/') : []
    const to = target.split('/')
    let shared = 0
    while (shared < from.length && shared < to.length && from[shared] === to[shared]) shared += 1
    const ups = from.length - shared
    const tail = to.slice(shared).join('/')
    return ups ? `${'../'.repeat(ups)}${tail}` : `./${tail}`
}

/**
 * @param {Record<string, string>} files map of "src/…" (or "/src/…") → body
 * @param {Iterable<string>} [knownPaths] paths that exist outside `files` (e.g. files already synced into the guest)
 * @param {{ canonicalButton?: string }} [options] fallback button.jsx body when `ui/button` exists nowhere
 * @returns {{ files: Record<string, string>, patch: Record<string, string>, changed: boolean, healed: string[] }}
 */
export function healUiImports(files = {}, knownPaths = [], options = {}) {
    const untouched = { files: files || {}, patch: {}, changed: false, healed: [] }
    if (! files || typeof files !== 'object') return untouched

    const exists = new Set()
    for (const path of Object.keys(files)) exists.add(stripSlashes(path))
    for (const path of knownPaths || []) exists.add(stripSlashes(path))

    const moduleExists = (base) => PROBE_EXTS.some((ext) => exists.has(base + ext))

    const canonicalButton = String(options.canonicalButton || '')
    let injectButton = false

    /** @type {Record<string, string>} */
    const patch = {}
    /** @type {string[]} */
    const healed = []

    for (const [key, body] of Object.entries(files)) {
        const rel = stripSlashes(key)
        if (typeof body !== 'string' || ! CODE_FILE_RE.test(rel) || rel.includes('node_modules/')) continue

        const fromDir = dirOf(rel)
        let touched = false
        const next = body.replace(SPEC_RE, (all, lead, quote, spec) => {
            const resolved = resolveSpec(fromDir, spec)
            if (! resolved || moduleExists(resolved)) return all

            const tail = spec.match(UI_TAIL_RE)
            if (! tail) return all

            const ext = tail[1].match(/\.(?:jsx?|tsx?)$/i)?.[0] || ''
            const name = ext ? tail[1].slice(0, -ext.length) : tail[1]
            const home = `${UI_HOME_DIR}/${name}`
            let homeExists = moduleExists(home)
            if (! homeExists && name === 'button' && canonicalButton) {
                injectButton = true
                exists.add(BUTTON_PATH)
                homeExists = true
            }
            if (! homeExists) return all

            touched = true
            return `${lead}${quote}${relativeSpec(fromDir, home)}${ext}${quote}`
        })

        if (touched) {
            patch[key] = next
            healed.push(key)
        }
    }

    if (! healed.length) return untouched

    if (injectButton && ! Object.keys(files).some((key) => stripSlashes(key) === BUTTON_PATH)) {
        patch[BUTTON_PATH] = canonicalButton
    }

    return { files: { ...files, ...patch }, patch, changed: true, healed }
}
