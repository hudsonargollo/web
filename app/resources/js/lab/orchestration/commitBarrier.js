import { SCOPES } from './constants.js'
import { VFS_STUB_MARKER } from './vfsHeal.js'

/**
 * Atomic Commit Barrier — memory + optional disk all-or-nothing.
 *
 * Order:
 * 1) Disk staging commit (if persistDisk provided) — failure => no memory promote
 * 2) Memory promoteToCanonical
 * 3) If memory promote throws after disk succeeded => revertDisk + leave Canonical untouched
 *
 * @param {{
 *   workingVfs: object,
 *   scope?: string,
 *   promote: (files: Record<string, string>) => Promise<void>|void,
 *   persistDisk?: (files: Record<string, string>) => Promise<void>|void,
 *   revertDisk?: (snapshot: Record<string, string|null>) => Promise<void>|void,
 *   preCanonicalSnapshot?: Record<string, string|null>,
 *   aborted?: boolean,
 * }} args
 */
export async function atomicCommit(args = {}) {
    const {
        workingVfs,
        scope = SCOPES.SINGLE_FILE,
        promote,
        persistDisk = null,
        revertDisk = null,
        preCanonicalSnapshot = null,
        aborted = false,
    } = args

    if (aborted || workingVfs?.isDiscarded?.()) {
        workingVfs?.discard?.()
        return {
            ok: false,
            rolledBack: true,
            reason: 'aborted',
            paths: [],
        }
    }

    const pending = workingVfs.pendingWrites()
    // Empty compile stubs must never reach disk or the preview — they
    // compile clean and paint a blank canvas (no error card, no auto-fix).
    const files = Object.fromEntries(
        Object.entries(pending).filter(([, body]) => ! String(body || '').includes(VFS_STUB_MARKER)),
    )
    const paths = Object.keys(files)

    if (! paths.length) {
        workingVfs.discard()
        return {
            ok: false,
            rolledBack: false,
            reason: 'empty',
            paths: [],
        }
    }

    const atomic = scope === SCOPES.MULTI_FILE
        || scope === SCOPES.SCAFFOLD
        || paths.length > 1

    let diskCommitted = false

    try {
        if (typeof persistDisk === 'function') {
            await persistDisk(files)
            diskCommitted = true
        }

        await promote(files)
        workingVfs.discard()
        return {
            ok: true,
            rolledBack: false,
            reason: 'committed',
            paths,
            atomic,
            diskCommitted,
        }
    } catch (error) {
        workingVfs.discard()

        if (diskCommitted && typeof revertDisk === 'function' && preCanonicalSnapshot) {
            try {
                await revertDisk(preCanonicalSnapshot)
            } catch {
                /* best-effort disk revert */
            }
        }

        return {
            ok: false,
            rolledBack: true,
            reason: diskCommitted ? 'memory_promote_failed_after_disk' : 'promote_failed',
            paths,
            atomic,
            diskCommitted,
            error: error?.message || 'Commit promote failed',
        }
    }
}

/**
 * Hard-fail rollback — discard Working, zero Canonical bytes.
 */
export function rollbackWorking(workingVfs) {
    const paths = workingVfs?.touchedPaths?.() || []
    workingVfs?.discard?.()
    return {
        ok: false,
        rolledBack: true,
        reason: 'validator_hard_fail',
        paths,
    }
}

/**
 * Build a path→content|null snapshot for disk revert after failed memory promote.
 */
export function snapshotPaths(contents = {}, paths = []) {
    /** @type {Record<string, string|null>} */
    const out = Object.create(null)
    for (const path of paths) {
        out[path] = Object.prototype.hasOwnProperty.call(contents, path)
            ? contents[path]
            : null
    }
    return out
}
