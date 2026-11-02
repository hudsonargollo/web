/**
 * Heal guest Vite "Failed to resolve import" errors by re-fetching the target
 * module from disk and force-syncing it into the DeepThought pod.
 */

import { fetchFileContent } from './files.js'
import { syncLabVfsToGuest, pushLabPreview } from './labRuntime.js'
import { parseUnresolvedImport, resolveImportCandidatePaths } from './guestImportParse.js'

export { parseUnresolvedImport, resolveImportCandidatePaths } from './guestImportParse.js'

/**
 * @param {{
 *   projectUuid: string,
 *   message: string,
 *   treePaths?: string[],
 *   getContents?: () => Record<string, string>,
 *   onHydrate?: (path: string, content: string) => void,
 * }} args
 * @returns {Promise<boolean>}
 */
export async function repairGuestImport(args) {
    const parsed = parseUnresolvedImport(args.message)
    if (! parsed || ! args.projectUuid) return false

    const treeSet = new Set((args.treePaths || []).map((path) => String(path || '').trim()).filter(Boolean))
    const contents = typeof args.getContents === 'function' ? (args.getContents() || {}) : {}
    const candidates = resolveImportCandidatePaths(parsed.from, parsed.spec)
    const target = candidates.find((path) => (
        treeSet.has(path) || Object.prototype.hasOwnProperty.call(contents, path)
    ))

    // Ghost import: guest App.jsx imports a page that never landed on disk — revert
    // the importer from the server canonical copy so preview matches saved files.
    if (! target) {
        try {
            const payload = await fetchFileContent(args.projectUuid, parsed.from)
            const body = payload.content ?? ''
            const patch = { [parsed.from]: body }
            await syncLabVfsToGuest(patch, { force: true })
            await pushLabPreview(patch, 'ghost-import-revert')
            args.onHydrate?.(parsed.from, body)
            return true
        } catch {
            return false
        }
    }

    let body = contents[target]
    if (body == null) {
        try {
            const payload = await fetchFileContent(args.projectUuid, target)
            body = payload.content ?? ''
        } catch {
            return false
        }
        args.onHydrate?.(target, body)
    }

    const patch = { [target]: body }
    if (contents[parsed.from] != null) {
        patch[parsed.from] = contents[parsed.from]
    }

    await syncLabVfsToGuest(patch, { force: true })
    await pushLabPreview(patch, 'import-heal')
    return true
}
