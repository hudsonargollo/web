function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
}

async function parseJson(response) {
    const data = await response.json().catch(() => ({}))
    if (! response.ok) {
        let message = typeof data.message === 'string' ? data.message.trim() : ''
        if (! message && response.status === 429) {
            const retryAfter = response.headers.get('Retry-After')
            message = retryAfter
                ? `Too many requests — wait ${retryAfter}s and try again.`
                : 'Too many requests — wait a minute and try again.'
        }
        const error = new Error(message || `Request failed (${response.status})`)
        error.status = response.status
        error.payload = data
        throw error
    }
    return data
}

export async function fetchGithubAccounts() {
    const response = await fetch('/lab/github/accounts', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    })
    return parseJson(response)
}

export async function fetchGithubRepositories(query = '') {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    const suffix = params.toString() ? `?${params}` : ''
    const response = await fetch(`/lab/github/repositories${suffix}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    })
    return parseJson(response)
}

export async function fetchGithubBranches(owner, repo) {
    const params = new URLSearchParams({
        owner: String(owner || ''),
        repo: String(repo || ''),
    })
    const response = await fetch(`/lab/github/branches?${params}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    })
    return parseJson(response)
}

/**
 * Import a public (or user-linked) GitHub repo into the Lab workspace.
 * @param {{
 *   url?: string,
 *   owner?: string,
 *   repo?: string,
 *   branch?: string,
 *   rootDirectory?: string,
 *   firstPrompt?: string,
 *   projectUuid?: string|null,
 * }} payload
 */
export async function importGithubRepository(payload = {}) {
    const body = {
        url: payload.url || undefined,
        owner: payload.owner || undefined,
        repo: payload.repo || undefined,
        branch: payload.branch || undefined,
        root_directory: payload.rootDirectory || undefined,
        first_prompt: payload.firstPrompt || undefined,
        project_uuid: payload.projectUuid || undefined,
    }

    const response = await fetch('/lab/github/import', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify(body),
    })
    return parseJson(response)
}

export function githubConnectUrl(returnPath = '/lab') {
    const params = new URLSearchParams({ return: returnPath })
    return `/lab/vcs/github/start?${params}`
}

export async function unlinkGithubAccount() {
    const response = await fetch('/lab/vcs/github/link', {
        method: 'DELETE',
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
    })
    return parseJson(response)
}
