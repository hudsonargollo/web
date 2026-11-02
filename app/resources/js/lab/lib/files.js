function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
}

async function parseJson(response) {
    const data = await response.json().catch(() => ({}))
    if (! response.ok) {
        const error = new Error(data.message || `Request failed (${response.status})`)
        error.status = response.status
        error.payload = data
        throw error
    }
    return data
}

function filesUrl(projectUuid, suffix = '') {
    return `/lab/${encodeURIComponent(projectUuid)}/files${suffix}`
}

export async function fetchProjectTree(projectUuid) {
    const response = await fetch(filesUrl(projectUuid, '/tree'), {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    })
    return parseJson(response)
}

export async function fetchFileContent(projectUuid, path) {
    const query = new URLSearchParams({ path })
    const response = await fetch(`${filesUrl(projectUuid, '/content')}?${query}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    })
    return parseJson(response)
}

/**
 * @param {string} projectUuid
 * @param {string[]} paths
 * @returns {Promise<Record<string, string>>}
 */
export async function fetchFilesBatch(projectUuid, paths = []) {
    const unique = [...new Set((paths || []).map((p) => String(p || '').trim()).filter(Boolean))]
    if (! unique.length) return {}

    /** @type {Record<string, string>} */
    const out = {}
    const chunkSize = 200
    for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize)
        const response = await fetch(filesUrl(projectUuid, '/batch'), {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ paths: chunk }),
        })
        const data = await parseJson(response)
        const files = data.files && typeof data.files === 'object' ? data.files : {}
        Object.assign(out, files)
    }
    return out
}

export async function saveFileContent(projectUuid, path, content) {
    const response = await fetch(filesUrl(projectUuid, '/content'), {
        method: 'PUT',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ path, content }),
    })
    return parseJson(response)
}

/**
 * All-or-nothing multi-file disk commit (server staging transaction).
 * @param {string} projectUuid
 * @param {Record<string, string>} files
 */
export async function commitFilesAtomic(projectUuid, files) {
    const response = await fetch(filesUrl(projectUuid, '/commit'), {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ files }),
    })
    return parseJson(response)
}

export async function mkdirProjectPath(projectUuid, path) {
    const response = await fetch(filesUrl(projectUuid, '/mkdir'), {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ path }),
    })
    return parseJson(response)
}

export async function deleteProjectPath(projectUuid, path) {
    const response = await fetch(filesUrl(projectUuid, ''), {
        method: 'DELETE',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ path }),
    })
    return parseJson(response)
}
