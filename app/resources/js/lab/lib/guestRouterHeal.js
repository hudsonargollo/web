/**
 * Heal invalid hook / custom MemoryRouter.jsx errors in the guest pod.
 */

import { fetchFileContent } from './files.js'
import {
    purgeGuestCustomRouterFiles,
    pushLabPreview,
    syncLabVfsToGuest,
} from './labRuntime.js'
import { normalizeGuestRouter } from './normalizeGuestRouter.js'

const CUSTOM_ROUTER_ERROR = /MemoryRouter\.jsx|Invalid hook call|reading 'useRef'/i

/** @param {string} message */
export function looksLikeCustomRouterGuestError(message = '') {
    return CUSTOM_ROUTER_ERROR.test(String(message || ''))
}

/**
 * @param {{
 *   projectUuid: string,
 *   getContents?: () => Record<string, string>,
 * }} args
 * @returns {Promise<boolean>}
 */
export async function repairGuestRouter(args) {
    if (! args.projectUuid) return false

    await purgeGuestCustomRouterFiles()

    const contents = typeof args.getContents === 'function' ? (args.getContents() || {}) : {}
    /** @type {Record<string, string>} */
    let patch = { ...contents }

    for (const key of ['src/main.jsx', 'src/App.jsx']) {
        if (patch[key] == null) {
            try {
                const payload = await fetchFileContent(args.projectUuid, key)
                patch[key] = payload.content ?? ''
            } catch {
                /* optional */
            }
        }
    }

    patch = normalizeGuestRouter(patch)
    if (! Object.keys(patch).length) return false

    await syncLabVfsToGuest(patch, { force: true })
    await pushLabPreview(patch, 'router-heal')
    return true
}
