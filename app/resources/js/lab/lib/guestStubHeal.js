/**
 * Heal placeholder components (ServicesHero, ClosingCta, …) without a model turn.
 */

import { fetchFileContent, saveFileContent } from './files.js'
import { healComponentStubs } from './componentStub.js'
import { pushLabPreview, syncLabVfsToGuest } from './labRuntime.js'

/**
 * @param {{
 *   projectUuid: string,
 *   getContents?: () => Record<string, string>,
 *   onHydrate?: (path: string, content: string) => void,
 * }} args
 * @returns {Promise<boolean>}
 */
export async function repairGuestStubs(args) {
    if (! args.projectUuid) return false

    const contents = typeof args.getContents === 'function' ? (args.getContents() || {}) : {}
    const { patch, healed } = healComponentStubs(contents)
    if (! healed.length) return false

    const next = { ...contents, ...patch }

    for (const path of healed) {
        args.onHydrate?.(path, patch[path])
        try {
            await saveFileContent(args.projectUuid, path, patch[path])
        } catch {
            /* disk heal is best-effort */
        }
    }

    await syncLabVfsToGuest(next, { force: true })
    await pushLabPreview(next, 'stub-heal')
    return true
}

/**
 * @param {string} projectUuid
 * @param {string[]} paths
 */
export async function fetchStubHealContents(projectUuid, paths = []) {
    /** @type {Record<string, string>} */
    const contents = {}
    for (const path of paths) {
        try {
            const payload = await fetchFileContent(projectUuid, path)
            contents[path] = payload.content ?? ''
        } catch {
            /* optional */
        }
    }
    return contents
}
