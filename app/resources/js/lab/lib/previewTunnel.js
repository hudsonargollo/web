/**
 * Share the live DeepThought tunnel URL with a private /preview tab.
 * The pod lives in the workspace tab; the preview tab only iframes it.
 */

import { withLabHandoffQuery, workspaceWindowName } from './labUrl'

const HANDOFF_TTL_MS = 120_000

function channelName(uuid) {
    return `krikkit-lab-preview:${String(uuid || '').trim()}`
}

function handoffKey(uuid) {
    return `krikkit-lab-handoff:${String(uuid || '').trim()}`
}

function storageKey(uuid) {
    return channelName(uuid)
}

export function publishPreviewTunnel(uuid, payload) {
    const id = String(uuid || '').trim()
    if (! id || ! payload?.url) return
    const msg = {
        type: 'tunnel',
        uuid: id,
        url: String(payload.url),
        path: payload.path || '/',
        port: payload.port || null,
        at: Date.now(),
    }
    try {
        localStorage.setItem(storageKey(id), JSON.stringify(msg))
    } catch {
        /* private mode */
    }
    try {
        const ch = new BroadcastChannel(channelName(id))
        ch.postMessage(msg)
        ch.close()
    } catch {
        /* BroadcastChannel unavailable */
    }
}

export function clearPreviewTunnel(uuid) {
    const id = String(uuid || '').trim()
    if (! id) return
    try {
        localStorage.removeItem(storageKey(id))
    } catch {
        /* ignore */
    }
    try {
        const ch = new BroadcastChannel(channelName(id))
        ch.postMessage({ type: 'tunnel-closed', uuid: id })
        ch.close()
    } catch {
        /* ignore */
    }
}

export function readPreviewTunnel(uuid) {
    const id = String(uuid || '').trim()
    if (! id) return null
    try {
        const raw = localStorage.getItem(storageKey(id))
        if (! raw) return null
        const data = JSON.parse(raw)
        if (! data?.url) return null
        return data
    } catch {
        return null
    }
}

/**
 * Preview tab: listen for tunnel updates and ping the workspace for a snapshot.
 * @param {string} uuid
 * @param {(msg: any) => void} onMessage
 */
export function subscribePreviewTunnel(uuid, onMessage) {
    const id = String(uuid || '').trim()
    if (! id) return () => {}

    let ch = null
    try {
        ch = new BroadcastChannel(channelName(id))
        ch.onmessage = (event) => {
            if (event?.data) onMessage(event.data)
        }
        ch.postMessage({ type: 'hello', uuid: id })
    } catch {
        /* ignore */
    }

    const onStorage = (event) => {
        if (event.key !== storageKey(id) || ! event.newValue) return
        try {
            onMessage(JSON.parse(event.newValue))
        } catch {
            /* ignore */
        }
    }
    window.addEventListener('storage', onStorage)

    const cached = readPreviewTunnel(id)
    if (cached) onMessage(cached)

    return () => {
        window.removeEventListener('storage', onStorage)
        try {
            ch?.close()
        } catch {
            /* ignore */
        }
    }
}

/**
 * Workspace tab: answer hello pings and receive pin-target / ask-lab / handoff from a preview tab.
 * @param {string} uuid
 * @param {{ onHello?: () => void, onAskLab?: (prompt: string) => void, onPinTarget?: (target: object) => void, onHandoff?: (payload: object) => void }} handlers
 */
export function listenPreviewTunnelClients(uuid, handlers = {}) {
    const id = String(uuid || '').trim()
    if (! id) return () => {}

    let ch = null
    try {
        ch = new BroadcastChannel(channelName(id))
        ch.onmessage = (event) => {
            const data = event?.data
            if (! data || data.uuid && data.uuid !== id) return
            if (data.type === 'hello') handlers.onHello?.()
            if (data.type === 'ask-lab' && typeof data.prompt === 'string') {
                handlers.onAskLab?.(data.prompt)
            }
            if (data.type === 'pin-target' && data.target) {
                handlers.onPinTarget?.(data.target)
            }
            if (data.type === 'handoff') {
                handlers.onHandoff?.(data)
            }
        }
    } catch {
        /* ignore */
    }

    return () => {
        try {
            ch?.close()
        } catch {
            /* ignore */
        }
    }
}

export function postAskLabToWorkspace(uuid, prompt) {
    const id = String(uuid || '').trim()
    const text = String(prompt || '').trim()
    if (! id || ! text) return false
    try {
        const ch = new BroadcastChannel(channelName(id))
        ch.postMessage({ type: 'ask-lab', uuid: id, prompt: text })
        ch.close()
        return true
    } catch {
        return false
    }
}

export function postPinTargetToWorkspace(uuid, target) {
    const id = String(uuid || '').trim()
    if (! id || ! target) return false
    try {
        const ch = new BroadcastChannel(channelName(id))
        ch.postMessage({ type: 'pin-target', uuid: id, target })
        ch.close()
        return true
    } catch {
        return false
    }
}

function normalizeHandoff(uuid, payload = {}) {
    const mode = payload.mode === 'inspect' ? 'inspect' : 'edit'
    return {
        type: 'handoff',
        uuid,
        mode,
        target: payload.target || null,
        at: Date.now(),
    }
}

export function clearWorkspaceHandoff(uuid) {
    const id = String(uuid || '').trim()
    if (! id) return
    try {
        localStorage.removeItem(handoffKey(id))
    } catch {
        /* ignore */
    }
}

export function stashWorkspaceHandoff(uuid, payload = {}) {
    const id = String(uuid || '').trim()
    if (! id) return null
    const msg = normalizeHandoff(id, payload)
    try {
        localStorage.setItem(handoffKey(id), JSON.stringify(msg))
    } catch {
        /* private mode */
    }
    try {
        const ch = new BroadcastChannel(channelName(id))
        ch.postMessage(msg)
        ch.close()
    } catch {
        /* BroadcastChannel unavailable */
    }
    return msg
}

export function readWorkspaceHandoff(uuid) {
    const id = String(uuid || '').trim()
    if (! id) return null
    try {
        const raw = localStorage.getItem(handoffKey(id))
        if (! raw) return null
        const data = JSON.parse(raw)
        if (! data || (data.uuid && data.uuid !== id)) return null
        if (Number(data.at) && Date.now() - Number(data.at) > HANDOFF_TTL_MS) {
            localStorage.removeItem(handoffKey(id))
            return null
        }
        return {
            type: 'handoff',
            uuid: id,
            mode: data.mode === 'inspect' ? 'inspect' : 'edit',
            target: data.target || null,
            at: Number(data.at) || Date.now(),
        }
    } catch {
        return null
    }
}

export function consumeWorkspaceHandoff(uuid) {
    const data = readWorkspaceHandoff(uuid)
    clearWorkspaceHandoff(uuid)
    return data
}

/**
 * Preview tab: stash the chosen action, ping a live workspace, and open/focus
 * /workspace in a named tab already armed for composer or inspect.
 */
export function openWorkspaceForHandoff(uuid, workspaceUrl, payload = {}) {
    const id = String(uuid || '').trim()
    if (! id) return false
    const msg = stashWorkspaceHandoff(id, payload)
    const name = workspaceWindowName(id)
    const path = withLabHandoffQuery(workspaceUrl || `/lab/${id}/workspace`, msg?.mode || 'edit')
    const href = typeof window === 'undefined'
        ? path
        : `${window.location.origin}${path}`

    if (typeof window === 'undefined') return false

    let win = null
    try {
        win = window.open('', name)
    } catch {
        win = null
    }

    if (win && ! win.closed) {
        let already = false
        try {
            already = String(win.location.pathname || '').includes(`/lab/${id}`)
        } catch {
            already = false
        }
        if (already) {
            try { win.focus() } catch { /* ignore */ }
            return true
        }
        try {
            win.location.href = href
            win.focus()
            return true
        } catch {
            /* fall through */
        }
    }

    try {
        win = window.open(href, name)
        try { win?.focus() } catch { /* ignore */ }
        return Boolean(win)
    } catch {
        return false
    }
}
