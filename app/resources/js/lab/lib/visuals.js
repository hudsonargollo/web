function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
}

/**
 * Server-side stock photograph lookup. Keys never leave Laravel.
 *
 * @param {{ query: string, count?: number, orientation?: string }} input
 * @returns {Promise<{ query: string, visuals: Array<object>, catalogs: { unsplash: boolean, pixabay: boolean } }>}
 */
export async function lookupLabVisuals(input = {}) {
    const query = String(input.query || '').trim()
    const body = { query }
    const count = Number(input.count)
    if (Number.isFinite(count) && count > 0) {
        body.count = Math.min(8, Math.max(1, Math.round(count)))
    }
    const orientation = String(input.orientation || '').trim().toLowerCase()
    if (['landscape', 'portrait', 'square'].includes(orientation)) {
        body.orientation = orientation
    }

    const response = await fetch('/lab/visuals', {
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

    const data = await response.json().catch(() => ({}))
    if (! response.ok) {
        const error = new Error(data.message || `Visual lookup failed (${response.status})`)
        error.status = response.status
        error.payload = data
        throw error
    }

    return {
        query: String(data.query || query),
        visuals: Array.isArray(data.visuals) ? data.visuals : [],
        catalogs: data.catalogs && typeof data.catalogs === 'object'
            ? data.catalogs
            : { unsplash: false, pixabay: false },
    }
}
