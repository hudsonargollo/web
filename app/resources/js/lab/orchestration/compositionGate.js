/**
 * Local composition checks (no model). Keep in lockstep with
 * App\\Ai\\Lab\\CompositionContract.
 *
 * Narrow by design: only mechanically-detectable garbage blocks a write
 * (grids of empty placeholder tiles standing in for photographs).
 * Taste and structure live in the design-language prompt, not in regexes.
 */

export function inspectComposition(files = {}) {
    const issues = []
    const map = files && typeof files === 'object' ? files : {}
    for (const [path, body] of Object.entries(map)) {
        issues.push(...inspectFile(String(path).replaceAll('\\', '/'), String(body ?? '')))
    }
    const app = fileNamed(map, 'App.jsx')
    if (app != null && isLandingSectionStack(app)) {
        issues.push({
            code: 'landing_section_stack',
            path: 'src/App.jsx',
            detail: 'Generic Hero + Collection + About + Footer stack. Name sections after their real content and give each depth.',
        })
    }
    return { ok: issues.length === 0, issues }
}

export function writeReject(path, body) {
    const normalized = String(path || '').replaceAll('\\', '/')
    const source = String(body ?? '')
    return inspectFile(normalized, source)
        .find((issue) => [
            'empty_product_tiles',
            'dead_grid_span',
            'custom_router_wrapper',
            'hooks_outside_component',
            'component_name_stub',
            'poster_glow_hero',
        ].includes(issue.code)) || null
}

export function rejectsCompositionWrite(path, body) {
    return writeReject(path, body) != null
}

export function compositionHint(code = '') {
    if (code === 'empty_product_tiles') return 'composition_empty_tile'
    if (code === 'landing_section_stack') return 'composition_section_stack'
    if (code === 'dead_grid_span') return 'composition_dead_span'
    if (code === 'custom_router_wrapper') return 'composition_custom_router'
    if (code === 'hooks_outside_component') return 'composition_hooks_outside'
    if (code === 'component_name_stub') return 'composition_name_stub'
    if (code === 'poster_glow_hero') return 'composition_poster_hero'
    return 'composition_reject'
}

function inspectFile(path, source) {
    const issues = []
    const hasImg = /<img\b/i.test(source)

    if (isCustomRouterWrapperPath(path)) {
        issues.push({
            code: 'custom_router_wrapper',
            path,
            detail: 'Never create a custom MemoryRouter/Router component. Import MemoryRouter, Routes, Route, Link, and useLocation from react-router-dom only.',
        })
    }

    if (/\.(jsx|tsx)$/i.test(path) && hooksOutsideComponent(source)) {
        issues.push({
            code: 'hooks_outside_component',
            path,
            detail: 'React hooks must run at the top level inside a function component — not at module scope, not inside callbacks.',
        })
    }

    if (/\.(jsx|tsx)$/i.test(path) && isComponentNameStub(source)) {
        issues.push({
            code: 'component_name_stub',
            path,
            detail: 'Placeholder component that only renders its own name. Ship real section content — copy, data arrays, CTAs, forms — matching the home page depth.',
        })
    }

    // Self-closing aspect-square divs are empty tile slots (no children, no photo).
    // Avatars, status dots, and sized decorations do not match this shape.
    const emptyTiles = (source.match(/<div\b[^>]*aspect-square[^>]*\/>/gi) || []).length
    const mapped = /\.map\s*\(/.test(source)
    if (! hasImg && (emptyTiles >= 3 || (emptyTiles >= 1 && mapped))) {
        issues.push({
            code: 'empty_product_tiles',
            path,
            detail: 'Empty aspect-square tiles without photographs.',
        })
    }
    // <Reveal> renders the grid child itself — a col/row-span on a lone div
    // directly inside it is dead and leaves the grid column empty.
    const revealSpans = source.matchAll(/<Reveal\b([^>]*)>\s*<div\b[^>]*\bcol-span-\d/g)
    for (const match of revealSpans) {
        if (/col-span/i.test(match[1] || '')) continue
        issues.push({
            code: 'dead_grid_span',
            path,
            detail: 'col-span on a div directly inside <Reveal> has no effect — move layout classes onto the Reveal itself.',
        })
        break
    }
    if (/\/Hero\.(jsx|tsx)$/i.test(path) && isGlowOnlyHero(source)) {
        issues.push({
            code: 'poster_glow_hero',
            path,
            detail: 'Glow-only hero — add a product mock (inbox/dashboard, 12+ rows) or split artifact, not just headline on a blur blob.',
        })
    }
    return issues
}

function isLandingSectionStack(app) {
    return /\bHero\b/.test(app)
        && /\bCollection\b/.test(app)
        && /\b(Atelier|About|Contact)\b/.test(app)
        && /\bFooter\b/.test(app)
}

function fileNamed(files, basename) {
    for (const [path, body] of Object.entries(files || {})) {
        const name = String(path).replaceAll('\\', '/').split('/').pop()
        if (name === basename) return String(body ?? '')
    }
    return null
}

const HOOK_CALL = /\buse(?:State|Effect|Ref|Memo|Callback|Context|Reducer|LayoutEffect|Id|Transition|DeferredValue|SyncExternalStore|InsertionEffect|Location|Navigate|Params|SearchParams|Match|Matches|OutletContext|InRouterContext)\s*\(/i

function hooksOutsideComponent(source) {
    const stripped = String(source || '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
    const hookAt = stripped.search(HOOK_CALL)
    if (hookAt < 0) return false
    const componentAt = stripped.search(/\b(?:export\s+default\s+function|export\s+function|function\s+[A-Z]\w*\s*\()/)
    return componentAt < 0 || hookAt < componentAt
}

function isCustomRouterWrapperPath(path) {
    const base = String(path || '').replaceAll('\\', '/').split('/').pop() || ''
    return /^(MemoryRouter|HashRouter|BrowserRouter|Router)\.jsx$/i.test(base)
}

function isComponentNameStub(source) {
    const match = String(source || '').match(/\bfunction\s+([A-Z]\w*)\s*\(/)
    const name = match?.[1] || ''
    if (! name) return false
    if (! new RegExp(`<h[12]\\b[^>]*>\\s*${name}\\s*<\\/h[12]>`).test(source)) return false
    if (/\.map\s*\(/.test(source)) return false
    if (/<(Button|Input|Label|Textarea|Link|img)\b/i.test(source)) return false
    return source.length < 700
}

function isGlowOnlyHero(source) {
    const hasGlow = /blur-(?:2xl|3xl)|radial-gradient|bg-accent\/\d+\s+blur/i.test(source)
    if (! hasGlow) return false
    const hasProductArtifact = /\.map\s*\(/.test(source)
        || /<img\b/i.test(source)
        || /-mb-(?:24|32|40)/.test(source)
        || /lg:grid-cols/.test(source)
        || /overflow-hidden rounded-2xl bg-soft/.test(source)
        || /size-\[(?:1[89]|2[0-4])rem\]/.test(source)
    return ! hasProductArtifact
}
