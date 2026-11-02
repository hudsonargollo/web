/**
 * Lab runtime warm + legacy RV64 cache migration + optional autostart hook.
 */

import { publishLabPhase, resetLabAutostart } from './labAutostart'
import {
    destroyLabSession,
    ensureLabSession,
    getLabRuntime,
    resetLegacyLabRuntimeCaches,
    syncLabVfsToGuest,
    vfsContentsToFiles,
} from './labRuntime'

/** @type {AbortController|null} */
let warmAbort = null

/**
 * Purge old emulator caches, then boot the Lab runtime with optional VFS files.
 *
 * @param {{ files?: Record<string, string> }} [opts]
 */
export function warmLabRuntime(opts = {}) {
    warmAbort?.abort()
    const ac = new AbortController()
    warmAbort = ac

    void (async () => {
        try {
            // Re-warm after VFS hydrate must not pin Preview on "Starting preview…"
            // — autostart will no-op as already-running and never emit a later phase.
            if (! getLabRuntime()) publishLabPhase('boot')
            await resetLegacyLabRuntimeCaches()
            if (ac.signal.aborted) return
            const raw = opts.files && typeof opts.files === 'object' ? opts.files : {}
            await ensureLabSession({
                files: vfsContentsToFiles(raw),
            })
            if (ac.signal.aborted) return
            if (Object.keys(raw).length) {
                await syncLabVfsToGuest(raw, { force: true })
            }
        } catch (err) {
            if (ac.signal.aborted) return
            console.warn('[lab] runtime warm failed', err)
            publishLabPhase('error', { message: err?.message || String(err) })
        }
    })()
}

/** Tear down pod on project switch / unmount. */
export function resetLabRuntimeWarm() {
    warmAbort?.abort()
    warmAbort = null
    resetLabAutostart()
    void import('../components/ConsoleTerminal').then((m) => {
        m.clearSharedConsoleTerminal?.()
    })
    destroyLabSession()
}

/** @deprecated Use warmLabRuntime */
export const warmLabDeepThought = warmLabRuntime
/** @deprecated Use resetLabRuntimeWarm */
export const resetLabDeepThoughtWarm = resetLabRuntimeWarm
