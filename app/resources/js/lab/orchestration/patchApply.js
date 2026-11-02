import {
    ERROR_CLASSES,
    WRITE_MODES,
} from './constants.js'
import { observationError, observationFallback, observationOk } from './observations.js'
import { isWritableLabPath, normalizeVfsPath } from '../lib/vfs.js'
import { normalizeLabPackageJson } from '../lib/toolchainPins.js'
import { ensureDualComponentExport } from '../lib/jsxExports.js'
import {
    buildDiffLoopSummary,
    buildDiffSignature,
    buildPrewriteRejectSummary,
} from './patchGate.js'
import { healSourceSyntax, probeSourceSyntax } from './syntaxProbe.js'

export {
    buildRejectFeedback,
    hashSearchPayload,
    locatePatchTarget,
    normalizeEol,
    normalizeLineForMatch,
} from './patchMatch.js'

/**
 * Atomic full-file write against Working VFS (sole mutation path).
 *
 * Gatekeeper (NON-NEGOTIABLE):
 * 1. Compute candidate body in memory — never write first.
 * 2. Circuit-breaker check (near-identical streak).
 * 3. Light structure validation (balanced tags / braces).
 * 4. Only then commit to Working VFS.
 *
 * Search/replace / fuzzy patch matching is retired — callers must pass fullContent.
 *
 * @param {{
 *   workingVfs: ReturnType<import('./workingVfs').createWorkingVfs>,
 *   path: string,
 *   search?: string|null,
 *   replace?: string|null,
 *   fullContent?: string|null,
 *   writeMode?: string,
 *   patchGate?: ReturnType<import('./patchGate').createPatchGate>|null,
 * }} args
 */
export async function applyWriteToWorking(args = {}) {
    const {
        workingVfs,
        path: rawPath,
        search = null,
        replace = null,
        fullContent = null,
        writeMode = WRITE_MODES.PATCH,
        patchGate = null,
    } = args

    const path = normalizeVfsPath(rawPath)

    if (! workingVfs || ! path) {
        return observationError('write', 'Missing path or working VFS', {
            errorClass: ERROR_CLASSES.POLICY,
            hint: 'file_missing',
        })
    }

    // Permission gate — clear reject, never enter a blind diff-loop retry.
    if (! isWritableLabPath(path)) {
        return observationError(
            'write',
            [
                `Path is not writable: ${path}.`,
                'Lab VFS only allows writes under src/, public/, and root config files',
                '(package.json, vite.config.*, postcss.config.*, index.html).',
                'For Tailwind v4 themes/fonts/plugins, edit src/index.css with',
                '@import "tailwindcss"; and @theme { … } — do not retry this path.',
            ].join(' '),
            {
                errorClass: ERROR_CLASSES.POLICY,
                hint: 'not_writable',
                artifacts: {
                    path,
                    rejected: true,
                    gate: 'writable_sandbox',
                    permission: 'denied',
                    retry: false,
                },
            },
        )
    }

    // Always read the live patch-engine buffer (synced on every Working VFS write / heal).
    const before = readLiveBuffer(workingVfs, path)

    // Managed build config: overwriting the workspace vite/postcss config is
    // how toolchains drift (Vite 8 / rolldown breaks the in-browser runtime).
    if (/^(vite|postcss)\.config\.[cm]?[jt]s$/.test(path) && before.trim() !== '') {
        return observationError(
            'write',
            [
                `${path} is managed by the workspace — do not overwrite it.`,
                'Add runtime libraries via package.json dependencies;',
                'theme, fonts, and Tailwind v4 setup live in src/index.css',
                '(@import "tailwindcss"; @theme { … }). Do not retry this path.',
            ].join(' '),
            {
                errorClass: ERROR_CLASSES.POLICY,
                hint: 'managed_config',
                artifacts: {
                    path,
                    rejected: true,
                    gate: 'managed_toolchain',
                    retry: false,
                },
            },
        )
    }

    // Atomic full overwrite only — search/replace / fuzzy patch path is retired.
    void search
    void replace
    let body = fullContent == null ? '' : String(fullContent)
    let toolchainPinned = false
    if (path === 'package.json' && body.trim() !== '') {
        // Keep model-added deps, force the managed toolchain (vite 7 stack,
        // matched react pair) — drifting majors break the WASM dev server.
        const normalized = normalizeLabPackageJson(body)
        body = normalized.body
        toolchainPinned = normalized.changed
    }
    let syntaxHealed = false
    if (/\.(jsx?|tsx?|mjs)$/i.test(path) && body.trim() !== '') {
        const healed = healSourceSyntax(path, body)
        if (healed.healed) {
            body = healed.body
            syntaxHealed = true
        }
    }
    // Dual-export only on a file that already parses. Appending
    // `export default X` to a truncated body used to make the healer
    // close tags *after* that line and reject a recover-able write.
    let exportsPinned = false
    if (/\.(jsx|tsx)$/i.test(path) && body.trim() !== '' && probeSourceSyntax(path, body).length === 0) {
        const dual = ensureDualComponentExport(path, body)
        if (dual.changed && probeSourceSyntax(path, dual.body).length === 0) {
            body = dual.body
            exportsPinned = true
        }
    }
    if (writeMode !== WRITE_MODES.FULL && (fullContent == null || body === '')) {
        return observationError(
            'write',
            `apply_patch / search-replace is disabled. Call write_file with the complete file contents for ${path}.`,
            {
                errorClass: ERROR_CLASSES.POLICY,
                hint: 'write_file_only',
                artifacts: { path, rejected: 'patch_mode' },
            },
        )
    }
    if (body === before) {
        return observationError('write', `write_file on ${path} produced no content change — supply the full updated file body.`, {
            errorClass: ERROR_CLASSES.POLICY,
            hint: 'noop_write',
            artifacts: { path, bytes: body.length },
        })
    }
    return commitCandidate({
        workingVfs,
        path,
        before,
        after: body,
        writeMode: WRITE_MODES.FULL,
        patchGate,
        okSummary: toolchainPinned
            ? `Full write applied to ${path} (managed toolchain versions re-pinned)`
            : (exportsPinned
                ? `Full write applied to ${path} (named + default export aligned)`
                : (syntaxHealed
                    ? `Full write applied to ${path} (syntax healed in place)`
                    : `Full write applied to ${path}`)),
        okArtifacts: {
            path,
            writeModeApplied: WRITE_MODES.FULL,
            bytes: body.length,
            beforeBytes: before.length,
            ...(toolchainPinned ? { toolchainPinned: true } : {}),
            ...(exportsPinned ? { exportsPinned: true } : {}),
            ...(syntaxHealed ? { syntaxHealed: true } : {}),
        },
    })
}

/**
 * Retired: Patch→Write threshold bypass. Always returns no-bypass (write_file-only world).
 *
 * @param {{
 *   before?: string,
 *   search?: string,
 *   replace?: string,
 *   fullContent?: string|null,
 * }} args
 * @returns {{
 *   bypass: boolean,
 *   reason?: string,
 *   body?: string,
 *   beforeLines?: number,
 *   replaceLines?: number,
 *   searchLines?: number,
 *   netAdded?: number,
 *   touchRatio?: number,
 * }}
 */
export function evaluatePatchToWriteUpgrade(args = {}) {
    void args
    return { bypass: false, reason: 'write_file_only' }
}

/**
 * Immediately refresh the Patch Engine file-buffer map after auto-heal / AST writes.
 * Call whenever Working VFS is mutated outside applyWriteToWorking.
 *
 * @param {object} workingVfs
 * @param {string[]|null} [paths]
 * @returns {Record<string, string>}
 */
export function syncPatchEngineBuffers(workingVfs, paths = null) {
    if (! workingVfs?.syncFileBuffers) {
        return workingVfs?.snapshot?.() || {}
    }
    return workingVfs.syncFileBuffers(paths)
}

/**
 * Gatekeeper: circuit breaker → syntax validate → write (or reject cleanly).
 *
 * @param {{
 *   workingVfs: object,
 *   path: string,
 *   before: string,
 *   after: string,
 *   writeMode: string,
 *   patchGate?: object|null,
 *   okSummary: string,
 *   okArtifacts?: object,
 *   asFallback?: boolean,
 *   deltaPreview?: { search?: string, replace?: string },
 * }} args
 */
async function commitCandidate(args = {}) {
    const {
        workingVfs,
        path,
        before,
        after,
        writeMode,
        patchGate = null,
        okSummary,
        okArtifacts = {},
        asFallback = false,
        deltaPreview = null,
    } = args

    const signature = buildDiffSignature(before, after, { writeMode })

    // 1) Diff-loop circuit breaker (before any mutation).
    if (patchGate) {
        const pre = patchGate.preflight(path, before, after, { writeMode })
        if (! pre.allow) {
            if (pre.restore != null) {
                patchGate.restoreAndLock(workingVfs, path, pre.restore)
                syncPatchEngineBuffers(workingVfs, [path])
            }
            return observationError(
                'write',
                buildDiffLoopSummary(path, {
                    streak: pre.streak,
                    similarity: pre.similarity,
                }),
                {
                    errorClass: ERROR_CLASSES.DIFF_LOOP,
                    hint: 'diff_loop_breaker',
                    artifacts: {
                        path,
                        rejected: true,
                        gate: pre.reason || 'diff_loop_breaker',
                        streak: pre.streak || 0,
                        similarity: pre.similarity ?? null,
                        writeMode,
                        locked: true,
                        restored: true,
                    },
                },
            )
        }
    }

    // 2) Light structure heuristics (sync) — keep VFS clean on obvious breaks.
    const structure = runLightStructureCheck(path, after)
    if (! structure.ok) {
        return observationError(
            'write',
            buildPrewriteRejectSummary({
                path,
                line: structure.line,
                column: structure.column,
                errorType: structure.errorType,
                message: structure.message,
                writeMode,
            }),
            {
                errorClass: ERROR_CLASSES.VALIDATION,
                hint: 'prewrite_reject',
                artifacts: {
                    path,
                    line: structure.line,
                    column: structure.column,
                    errorType: structure.errorType,
                    message: structure.message,
                    rejected: true,
                    gate: 'prewrite_structure',
                    writeMode,
                    ...(deltaPreview || {}),
                },
            },
        )
    }

    // 3) Commit — Working VFS only after gatekeeper pass (buffer map updates inside write).
    workingVfs.write(path, after)
    syncPatchEngineBuffers(workingVfs, [path])
    patchGate?.commitSuccess?.(path, before, after, signature)

    if (asFallback) {
        return observationFallback('write', okSummary, okArtifacts)
    }

    return observationOk('write', okSummary, okArtifacts)
}

function readLiveBuffer(workingVfs, path) {
    if (typeof workingVfs.getFileBuffer === 'function') {
        return workingVfs.getFileBuffer(path)
    }
    return workingVfs.has(path) ? workingVfs.read(path) : ''
}

/**
 * Cheap structural checks before committing a write.
 *
 * @param {string} path
 * @param {string} body
 * @returns {{ ok: boolean, line?: number|null, column?: number|null, errorType?: string, message?: string }}
 */
function runLightStructureCheck(path = '', body = '') {
    const text = String(body ?? '')
    const lower = String(path || '').toLowerCase()

    if (! text.trim() && /\.(jsx?|tsx?)$/i.test(path)) {
        return {
            ok: false,
            line: 1,
            column: 1,
            errorType: 'EmptySource',
            message: 'Source file is empty',
        }
    }

    if (/\.(jsx?|tsx?)$/i.test(path)) {
        // acorn-jsx is authoritative (same family as the in-browser bundler).
        // Lezer error nodes false-rejected complete files as "truncated".
        const syntax = probeSourceSyntax(path, text)
        if (syntax.length) {
            return {
                ok: false,
                line: syntax[0].line,
                column: 1,
                errorType: 'SyntaxError',
                message: syntax[0].message,
            }
        }

        const lines = text.split('\n')
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i]
            if (! /^\s*import\s+/.test(line)) continue
            if (/from\s+['"][^'"]+['"]\s*;?\s*$/.test(line)) continue
            if (/import\s+['"][^'"]+['"]\s*;?\s*$/.test(line)) continue
            if (/import\s*\(/.test(line)) continue
            if (/\{[^}]*$/.test(line) || /,\s*$/.test(line)) continue
            return {
                ok: false,
                line: i + 1,
                column: 1,
                errorType: 'MalformedImport',
                message: `Malformed import: ${line.trim().slice(0, 120)}`,
            }
        }
    }

    if (lower.endsWith('.json') && text.trim()) {
        try {
            JSON.parse(text)
        } catch (error) {
            return {
                ok: false,
                line: null,
                column: null,
                errorType: 'JsonParseError',
                message: error?.message || 'Invalid JSON',
            }
        }
    }

    return { ok: true }
}
