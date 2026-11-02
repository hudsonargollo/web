/**
 * Guest app routes inferred from VFS. Vite SPA fallback serves index.html for
 * every path, so Lab must decide when a typed address is a real 404.
 */

const PAGE_FILE = /^src\/pages\/(.+)\.(jsx?|tsx?|vue)$/i
const ROUTE_PATH = /\bpath\s*[:=]\s*['"`]([^'"`]+)['"`]/g
const LINK_TO = /\bto=["']([^"'#]+)["']/g
const SOURCE_FILE = /\.(jsx?|tsx?|vue)$/i

export function normalizeGuestRoute(path) {
    const raw = String(path || '').split('?')[0].split('#')[0].trim()
    if (! raw || raw === '/') return '/'
    const next = raw.startsWith('/') ? raw : `/${raw}`
    return next.length > 1 && next.endsWith('/') ? next.slice(0, -1) : next
}

export function discoverGuestRoutes(contents = {}) {
    const routes = new Set(['/'])
    let catchAll = false

    const addRoute = (value) => {
        const raw = String(value || '').trim()
        if (! raw || raw === '/') {
            routes.add('/')
            return
        }
        if (raw === '*' || raw === '/*') {
            catchAll = true
            return
        }
        if (! raw.startsWith('/')) return
        routes.add(normalizeGuestRoute(raw))
    }

    for (const [file, body] of Object.entries(contents || {})) {
        const page = String(file || '').match(PAGE_FILE)
        if (page) {
            const name = page[1].replace(/\/index$/i, '')
            const leaf = (name.split('/').pop() || name)
            // src/pages/ServicesPage.jsx — real paths live on <Route path="…"> in App.jsx.
            if (/Page$/i.test(leaf)) {
                // skip — avoids /ServicesPage noise in the chrome menu
            } else if (! name || name === 'index') {
                routes.add('/')
            } else {
                addRoute(`/${name.replace(/\[([^\]]+)\]/g, ':$1')}`)
            }
        }

        if (! SOURCE_FILE.test(file)) continue
        const text = String(body || '')
        ROUTE_PATH.lastIndex = 0
        let match
        while ((match = ROUTE_PATH.exec(text))) {
            addRoute(match[1])
        }
        LINK_TO.lastIndex = 0
        while ((match = LINK_TO.exec(text))) {
            addRoute(match[1])
        }
    }

    return { routes, catchAll }
}

/** Sorted page catalog entries for Preview chrome (path pill menu). */
export function guestRoutesAsPages(routes = new Set(['/'])) {
    const paths = [...routes].sort((a, b) => {
        if (a === '/') return -1
        if (b === '/') return 1
        return a.localeCompare(b)
    })
    return paths.map((path) => ({
        id: path,
        path,
        label: guestRouteLabel(path),
    }))
}

export function guestRouteLabel(path = '/') {
    if (! path || path === '/') return 'Homepage'
    const leaf = path.split('/').filter(Boolean).pop() || 'Page'
    return leaf.replace(/[-_]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export function guestRouteKnown(table, path) {
    const next = normalizeGuestRoute(path)
    if (! table) return next === '/'
    if (table.catchAll) return true
    if (table.routes?.has(next)) return true
    for (const pattern of table.routes || []) {
        if (matchRoutePattern(pattern, next)) return true
    }
    return false
}

function matchRoutePattern(pattern, path) {
    const p = normalizeGuestRoute(pattern).split('/').filter(Boolean)
    const a = normalizeGuestRoute(path).split('/').filter(Boolean)
    if (p.length !== a.length) return false
    return p.every((seg, i) => seg.startsWith(':') || seg === '*' || seg === a[i])
}
