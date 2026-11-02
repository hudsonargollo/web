export function parseLabPath(pathname = typeof window !== 'undefined' ? window.location.pathname : '') {
    if (pathname === '/lab' || pathname === '/lab/') {
        return { uuid: null, workspace: false }
    }

    const match = pathname.match(/^\/lab\/([^/]+)(?:\/(workspace))?\/?$/)
    if (! match) return null

    return {
        uuid: match[1],
        workspace: match[2] === 'workspace',
    }
}

/** Named browsing context so a preview tab can focus the existing workspace. */
export function workspaceWindowName(uuid) {
    const id = String(uuid || '').trim()
    return id ? `krikkit-lab-ws-${id}` : ''
}

export function readLabHandoffMode(search = typeof window !== 'undefined' ? window.location.search : '') {
    const mode = new URLSearchParams(search || '').get('lab')
    return mode === 'inspect' || mode === 'edit' ? mode : null
}

/** Studio → Lab composer fill (`/lab?brief=…`). */
export function readLabHandoffBrief(search = typeof window !== 'undefined' ? window.location.search : '') {
    return String(new URLSearchParams(search || '').get('brief') || '').trim()
}

/** Studio plus menu → open Import from GitHub (`/lab?import=github`). */
export function readLabHandoffImport(search = typeof window !== 'undefined' ? window.location.search : '') {
    return new URLSearchParams(search || '').get('import') === 'github'
}

/** Studio composer submit → auto-send the handed-off brief. */
export function readLabHandoffSend(search = typeof window !== 'undefined' ? window.location.search : '') {
    const params = new URLSearchParams(search || '')
    return params.get('send') === '1' || params.get('send') === 'true'
}

/** Studio composer → consume files stashed in IndexedDB (`/lab?files=1`). */
export function readLabHandoffFiles(search = typeof window !== 'undefined' ? window.location.search : '') {
    const params = new URLSearchParams(search || '')
    return params.get('files') === '1' || params.get('files') === 'true'
}

export function withLabHandoffQuery(workspaceUrl, mode) {
    const path = String(workspaceUrl || '')
    if (mode !== 'inspect' && mode !== 'edit') return path
    try {
        const url = new URL(path, 'http://lab.local')
        url.searchParams.set('lab', mode)
        return `${url.pathname}${url.search}${url.hash}`
    } catch {
        const join = path.includes('?') ? '&' : '?'
        return `${path}${join}lab=${encodeURIComponent(mode)}`
    }
}

export function adoptLabUrl(uuid, workspace = false, { replace = true } = {}) {
    if (! uuid || typeof window === 'undefined') return
    const next = workspace ? `/lab/${uuid}/workspace` : `/lab/${uuid}`
    if (window.location.pathname === next) return
    const state = { lab: true, uuid, workspace: Boolean(workspace) }
    // Default replaceState — pushState stacked fake /lab entries and fought Livewire history.
    if (replace) window.history.replaceState(state, '', next)
    else window.history.pushState(state, '', next)
}

export function setDocumentTitle(title) {
    if (typeof document === 'undefined') return
    document.title = title ? `${title} · Lab` : 'Krikkit · Lab'
}
