function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
}

async function parseJson(response) {
    const data = await response.json().catch(() => ({}))
    if (! response.ok) {
        let message = data.message || `Request failed (${response.status})`
        if (response.status === 413) {
            message = 'The build upload is too large for this server. Remove large assets from the project, or raise the server upload limit (LAB_PUBLISH_ARTIFACT_MAX_BYTES / PHP post_max_size).'
        }
        const error = new Error(message)
        error.status = response.status
        error.payload = data
        throw error
    }
    return data
}

function headers(json = false) {
    const next = {
        Accept: 'application/json',
        'X-CSRF-TOKEN': csrfToken(),
        'X-Requested-With': 'XMLHttpRequest',
    }
    if (json) next['Content-Type'] = 'application/json'
    return next
}

export async function fetchLabPublish(projectUuid) {
    const response = await fetch(`/lab/${encodeURIComponent(projectUuid)}/publish`, {
        headers: headers(),
        credentials: 'same-origin',
    })
    return parseJson(response)
}

export async function saveLabPublish(projectUuid, body) {
    const response = await fetch(`/lab/${encodeURIComponent(projectUuid)}/publish`, {
        method: 'PUT',
        headers: headers(true),
        credentials: 'same-origin',
        body: JSON.stringify(body),
    })
    return parseJson(response)
}

export async function verifyLabPublish(projectUuid) {
    const response = await fetch(`/lab/${encodeURIComponent(projectUuid)}/publish/verify`, {
        method: 'POST',
        headers: headers(),
        credentials: 'same-origin',
    })
    return parseJson(response)
}

export async function unpublishLabSite(projectUuid) {
    const response = await fetch(`/lab/${encodeURIComponent(projectUuid)}/publish`, {
        method: 'DELETE',
        headers: headers(),
        credentials: 'same-origin',
    })
    return parseJson(response)
}

export async function uploadLabPublishArtifact(projectUuid, blob) {
    const body = new FormData()
    body.append('artifact', blob, 'dist.zip')

    const response = await fetch(`/lab/${encodeURIComponent(projectUuid)}/publish/artifact`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body,
    })
    return parseJson(response)
}
