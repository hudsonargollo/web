export const GITHUB_AWAIT = 'lab-github-await'
export const GITHUB_READY = 'lab-github-ready'
export const GITHUB_CANCELLED = 'lab-github-cancelled'

function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
}

function labReturnPath() {
    return window.location.pathname.startsWith('/lab')
        ? window.location.pathname
        : '/lab'
}

async function requestGithub(path, { method = 'GET', body = null, signal = null } = {}) {
    const headers = {
        Accept: 'application/json',
        'X-CSRF-TOKEN': csrfToken(),
        'X-Requested-With': 'XMLHttpRequest',
    }
    const init = { method, headers, credentials: 'same-origin', signal }
    if (body !== null) {
        headers['Content-Type'] = 'application/json'
        init.body = JSON.stringify(body)
    }

    const response = await fetch(path, init)
    const data = await response.json().catch(() => ({}))
    if (! response.ok) {
        const error = new Error(data.message || `GitHub request failed (${response.status})`)
        error.status = response.status
        error.payload = data
        throw error
    }

    return data
}

export function githubProjectPath(projectUuid, suffix = '') {
    const uuid = String(projectUuid || '').trim()
    if (! uuid) {
        const error = new Error('Open a Lab project first.')
        error.code = 'no_project'
        throw error
    }

    return `/lab/${encodeURIComponent(uuid)}/github${suffix}`
}

export async function readLabGithubStatus(projectUuid, { signal } = {}) {
    return requestGithub(githubProjectPath(projectUuid), { signal })
}

export async function compareLabGithub(projectUuid, { signal, pathPrefix } = {}) {
    const prefix = String(pathPrefix || '').replace(/^\/+|\/+$/g, '')
    const suffix = prefix ? `/compare?path_prefix=${encodeURIComponent(prefix)}` : '/compare'
    return requestGithub(githubProjectPath(projectUuid, suffix), { signal })
}

export async function linkLabGithub(projectUuid, payload = {}) {
    return requestGithub(githubProjectPath(projectUuid, '/link'), { method: 'POST', body: payload })
}

export async function unlinkLabGithubRemote(projectUuid) {
    return requestGithub(githubProjectPath(projectUuid), { method: 'DELETE' })
}

export async function createLabGithubRepo(projectUuid, payload = {}) {
    return requestGithub(githubProjectPath(projectUuid, '/create'), { method: 'POST', body: payload })
}

export async function forkLabGithub(payload = {}, projectUuid = null) {
    const path = projectUuid
        ? githubProjectPath(projectUuid, '/fork')
        : '/lab/github/fork'
    return requestGithub(path, { method: 'POST', body: payload })
}

export async function pushLabGithub(projectUuid, payload = {}) {
    return requestGithub(githubProjectPath(projectUuid, '/push'), { method: 'POST', body: payload })
}

export async function pullLabGithub(projectUuid, payload = {}) {
    const body = {}
    const branch = String(payload.branch || '').trim()
    if (branch) body.branch = branch

    return requestGithub(githubProjectPath(projectUuid, '/pull'), { method: 'POST', body })
}

export async function listOwnedGithubRepos(query = '') {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : ''
    return requestGithub(`/lab/github/owned${suffix}`)
}

export function githubNeedsConnect(status) {
    return Boolean(status) && status.oauth_ready && ! status.linked
}

export function githubNeedsRemote(status) {
    return Boolean(status) && status.linked && ! status.remote
}

export function abortGithubWait() {
    const error = new Error('Stopped.')
    error.name = 'AbortError'
    error.code = 'ABORTED'
    return error
}

/**
 * Pause the agent until the user finishes GitHub OAuth / linking a remote.
 */
export function awaitLabGithubReady({ needRemote = false, signal = null } = {}) {
    if (signal?.aborted) return Promise.reject(abortGithubWait())

    return new Promise((resolve, reject) => {
        const detail = { needRemote, returnPath: labReturnPath() }
        const onReady = (event) => {
            cleanup()
            resolve(event?.detail || { ready: true })
        }
        const onCancel = () => {
            cleanup()
            const error = new Error('User declined GitHub.')
            error.code = 'cancelled'
            reject(error)
        }
        const onAbort = () => {
            cleanup()
            reject(abortGithubWait())
        }
        const cleanup = () => {
            window.removeEventListener(GITHUB_READY, onReady)
            window.removeEventListener(GITHUB_CANCELLED, onCancel)
            signal?.removeEventListener('abort', onAbort)
        }

        window.addEventListener(GITHUB_READY, onReady)
        window.addEventListener(GITHUB_CANCELLED, onCancel)
        signal?.addEventListener('abort', onAbort)
        window.dispatchEvent(new CustomEvent(GITHUB_AWAIT, { detail }))
    })
}
