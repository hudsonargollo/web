/**
 * Frontend bus for VFS dependency resolution / auto-heal → Terminal + chat badge.
 * Event names are stable for Lab layout listeners.
 */

export const VFS_HEAL_START = 'krikkit:vfs-heal-start'
export const VFS_HEAL_COMPLETE = 'krikkit:vfs-heal-complete'
export const VFS_HEAL_LOG = 'krikkit:vfs-heal-log'

/** Once per heal cycle — skip duplicate resolving-modules scans. */
let resolvingModulesLogged = false
let resolvingModulesFingerprint = ''

function fingerprintMissing(missing = []) {
    return [...new Set((Array.isArray(missing) ? missing : []).map(String).filter(Boolean))]
        .sort()
        .join('\0')
}

/**
 * @param {object} [detail]
 * @param {number} [detail.count]
 * @param {string[]} [detail.missing]
 * @param {string} [detail.reason]
 * @param {string|null} [detail.turnId]
 */
export function publishVfsHealStart(detail = {}) {
    if (typeof window === 'undefined') return
    const missing = Array.isArray(detail.missing)
        ? detail.missing.map(String).filter(Boolean)
        : []
    const count = Number(detail.count)
    const resolvedCount = Number.isFinite(count) && count > 0
        ? count
        : missing.length
    // New heal cycle — allow one resolving-modules scan log.
    resolvingModulesLogged = false
    resolvingModulesFingerprint = fingerprintMissing(missing)
    window.dispatchEvent(new CustomEvent(VFS_HEAL_START, {
        detail: {
            count: resolvedCount,
            missing,
            reason: detail.reason || 'topology',
            turnId: detail.turnId ?? null,
            at: Date.now(),
        },
    }))
}

/**
 * @param {object} [detail]
 * @param {boolean} [detail.ok]
 * @param {number} [detail.count]
 * @param {string|null} [detail.turnId]
 * @param {string[]} [detail.lines]
 */
export function publishVfsHealComplete(detail = {}) {
    if (typeof window === 'undefined') return
    resolvingModulesLogged = false
    resolvingModulesFingerprint = ''
    window.dispatchEvent(new CustomEvent(VFS_HEAL_COMPLETE, {
        detail: {
            ok: detail.ok !== false,
            count: Number(detail.count) || 0,
            lines: Array.isArray(detail.lines) ? detail.lines.map(String) : [],
            turnId: detail.turnId ?? null,
            at: Date.now(),
        },
    }))
}

/**
 * Stream a resolution log chunk into the Terminal session.
 * `resolving-modules` is logged once per heal cycle (or when the missing set changes).
 *
 * @param {object} [detail]
 * @param {string[]} [detail.lines]
 * @param {string[]} [detail.missing]
 * @param {string} [detail.command]
 * @param {number} [detail.exitCode]
 * @param {string|null} [detail.turnId]
 */
export function publishVfsHealLog(detail = {}) {
    if (typeof window === 'undefined') return
    const command = String(detail.command || 'vfs-heal').trim() || 'vfs-heal'
    const lines = Array.isArray(detail.lines)
        ? detail.lines.map(String).filter((row) => row.length > 0)
        : []
    if (! lines.length) return

    if (command === 'resolving-modules') {
        const nextFp = fingerprintMissing(detail.missing)
            || fingerprintMissing(
                lines
                    .map((row) => {
                        const match = /^\s*→\s+(.+)$/.exec(row)
                        return match ? match[1].trim() : ''
                    })
                    .filter(Boolean),
            )
        // Once per turn unless the missing-module set actually changed.
        if (resolvingModulesLogged && nextFp === resolvingModulesFingerprint) {
            return
        }
        resolvingModulesLogged = true
        if (nextFp) resolvingModulesFingerprint = nextFp
    }

    window.dispatchEvent(new CustomEvent(VFS_HEAL_LOG, {
        detail: {
            command,
            lines,
            missing: Array.isArray(detail.missing) ? detail.missing.map(String) : [],
            exitCode: Number(detail.exitCode) || 0,
            turnId: detail.turnId ?? null,
            at: Date.now(),
        },
    }))
}

/**
 * User-facing badge / terminal copy for N missing modules.
 *
 * @param {number} count
 * @returns {string}
 */
export function vfsHealResolvingLabel(count = 0) {
    const n = Math.max(0, Number(count) || 0)
    if (n <= 1) {
        return 'Resolving 1 missing module before compile…'
    }
    return `Resolving ${n} missing modules before compile…`
}
