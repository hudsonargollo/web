/**
 * Hoist MemoryRouter/HashRouter/BrowserRouter from App.jsx into main.jsx so
 * Lab preview can load /services (MemoryRouter needs initialEntries from URL).
 */

const ROUTERS = ['MemoryRouter', 'HashRouter', 'BrowserRouter']

/** Inline — must not rely on a separate helper (upgrade path can miss the insert). */
const MEMORY_ROUTER_OPEN = `<MemoryRouter initialEntries={[(() => {
  try {
    let p = window.location.pathname || '/'
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
    return p || '/'
  } catch (e) {
    return '/'
  }
})()]} initialIndex={0}>`

function isCustomRouterFile(path) {
    const base = String(path || '').replace(/^\/+/, '').split('/').pop() || ''
    return /^(MemoryRouter|HashRouter|BrowserRouter|Router)\.jsx$/i.test(base)
}

/** Guest paths that must never exist — they duplicate react-router-dom and break hooks. */
export const GUEST_CUSTOM_ROUTER_REL_PATHS = [
    'src/components/MemoryRouter.jsx',
    'src/components/HashRouter.jsx',
    'src/components/BrowserRouter.jsx',
    'src/components/Router.jsx',
]

function stripCustomRouterImports(source = '') {
    let out = String(source || '')
    out = out.replace(
        /import\s+\{[^}]*\}\s+from\s+['"][^'"]*\/components\/(?:MemoryRouter|HashRouter|BrowserRouter|Router)(?:\.jsx)?['"];?\s*\n?/gi,
        '',
    )
    out = out.replace(
        /import\s+(?:MemoryRouter|HashRouter|BrowserRouter|Router)\s+from\s+['"][^'"]*\/components\/(?:MemoryRouter|HashRouter|BrowserRouter|Router)(?:\.jsx)?['"];?\s*\n?/gi,
        '',
    )
    return out
}

function fixRouterDomImport(source = '', tag = 'MemoryRouter') {
    let out = stripCustomRouterImports(source)
    if (new RegExp(`import\\s+\\{[^}]*\\b${tag}\\b[^}]*\\}\\s+from\\s+['"]react-router-dom['"]`).test(out)) {
        return out
    }
    if (new RegExp(`import\\s+${tag}\\s+from\\s+['"][^'"]+['"]`).test(out)) {
        out = out.replace(
            new RegExp(`import\\s+${tag}\\s+from\\s+['"][^'"]+['"];?`, 'g'),
            `import { ${tag} } from 'react-router-dom'`,
        )
    }
    return out
}

function purgeCustomRouterFiles(files = {}) {
    const out = { ...files }
    let changed = false
    for (const key of Object.keys(out)) {
        if (! isCustomRouterFile(key)) continue
        delete out[key]
        changed = true
    }
    if (! changed) return { files: out, changed: false }
    for (const [key, body] of Object.entries(out)) {
        if (! /\.(jsx|tsx)$/i.test(key)) continue
        const cleaned = stripCustomRouterImports(body)
        if (cleaned !== body) out[key] = cleaned
    }
    return { files: out, changed: true }
}

function findKey(files, target) {
    const want = target.replace(/^\/+/, '')
    for (const key of Object.keys(files || {})) {
        if (String(key).replace(/^\/+/, '') === want) return key
    }
    return null
}

function routerInApp(source = '') {
    return ROUTERS.find((tag) => new RegExp(`<${tag}(\\s|>)`).test(String(source)))
}

function routerInMain(source = '') {
    return ROUTERS.find((tag) => new RegExp(`<${tag}(\\s|>)`).test(String(source)))
}

function stripRouterImport(source, tag) {
    return String(source).replace(
        new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]react-router-dom['"];?`, 'g'),
        (line, inner) => {
            const names = inner.split(',')
                .map((part) => part.trim())
                .filter(Boolean)
                .filter((name) => name !== tag && ! name.startsWith(`${tag} `))
            if (! names.length) return ''
            return `import { ${names.join(', ')} } from 'react-router-dom'`
        },
    )
}

function unwrapRouterFromApp(source, tag) {
    let app = String(source || '')
    const open = new RegExp(`<${tag}(\\s[^>]*)?>\\s*`, 'm')
    const close = new RegExp(`\\s*</${tag}>`, 'm')
    if (! open.test(app) || ! close.test(app)) return null

    app = app.replace(open, '')
    app = app.replace(close, '')
    app = stripRouterImport(app, tag)
    app = app.replace(/\n{3,}/g, '\n\n')
    return app
}

function ensureRouterImport(main, tag) {
    let out = String(main || '')
    if (out.includes('react-router-dom')) {
        return out.replace(
            /import\s*\{([^}]*)\}\s*from\s*['"]react-router-dom['"];?/,
            (line, inner) => {
                const names = inner.split(',').map((part) => part.trim()).filter(Boolean)
                if (! names.includes(tag)) names.unshift(tag)
                return `import { ${names.join(', ')} } from 'react-router-dom'`
            },
        )
    }
    const insertAt = out.indexOf("from 'react-dom/client'")
    if (insertAt >= 0) {
        const lineEnd = out.indexOf('\n', insertAt)
        return `${out.slice(0, lineEnd + 1)}import { ${tag} } from 'react-router-dom'\n${out.slice(lineEnd + 1)}`
    }
    return `import { ${tag} } from 'react-router-dom'\n${out}`
}

function wrapMainWithRouter(main, tag) {
    let out = ensureRouterImport(main, tag)
    if (routerInMain(out)) return out

    const open = tag === 'MemoryRouter'
        ? MEMORY_ROUTER_OPEN
        : `<${tag}>`

    if (/<StrictMode>\s*\n?\s*<App\s*\/>/.test(out)) {
        return out.replace(
            /(<StrictMode>\s*\n?\s*)<App\s*\/>/,
            `$1${open}\n      <App />\n    </${tag}>`,
        )
    }

    if (/<StrictMode>\s*\n?\s*<App>/.test(out)) {
        return out.replace(
            new RegExp(`(<StrictMode>\\s*\\n?\\s*)<App>([\\s\\S]*?</App>)`, 'm'),
            `$1${open}\n      <App>$2\n    </${tag}>`,
        )
    }

    return out
}

function upgradeMemoryRouterMain(main) {
    let out = String(main || '')
    out = out.replace(/__krikkitGuestEntry\s*\(\)/g, '(() => { try { let p = window.location.pathname || \'/\'; if (p.length > 1 && p.endsWith(\'/\')) p = p.slice(0, -1); return p || \'/\'; } catch (e) { return \'/\'; } })()')
    out = out.replace(/function __krikkitGuestEntry\(\)\s*\{[\s\S]*?\}\s*/g, '')
    if (out.includes('initialEntries') && out.includes('window.location.pathname')) {
        return out
    }
    return out.replace(
        /<MemoryRouter(\s[^>]*)?>/,
        MEMORY_ROUTER_OPEN,
    )
}

/**
 * @param {Record<string, string>} files normalized VFS paths (no leading slash)
 * @returns {Record<string, string>}
 */
export function normalizeGuestRouter(files = {}) {
    if (! files || typeof files !== 'object') return files

    const purged = purgeCustomRouterFiles(files)
    files = purged.files

    const appKey = findKey(files, 'src/App.jsx')
    const mainKey = findKey(files, 'src/main.jsx')
    if (! appKey || ! mainKey) return files

    const appTag = routerInApp(files[appKey])
    const mainTag = routerInMain(files[mainKey])
    let app = stripCustomRouterImports(files[appKey])
    let main = fixRouterDomImport(files[mainKey], 'MemoryRouter')

    if (appTag) {
        const unwrapped = unwrapRouterFromApp(app, appTag)
        if (unwrapped) app = unwrapped
    }

    if (mainTag) {
        if (
            mainTag === 'MemoryRouter'
            && (
                ! main.includes('initialEntries')
                || main.includes('__krikkitGuestEntry')
            )
        ) {
            main = upgradeMemoryRouterMain(main)
        }
    } else if (appTag) {
        main = wrapMainWithRouter(main, appTag)
    }

    if (app === files[appKey] && main === files[mainKey] && ! purged.changed) return files

    return {
        ...files,
        [appKey]: app,
        [mainKey]: main,
    }
}

export {
    routerInApp,
    routerInMain,
    unwrapRouterFromApp,
    wrapMainWithRouter,
    isCustomRouterFile,
    purgeCustomRouterFiles,
}
