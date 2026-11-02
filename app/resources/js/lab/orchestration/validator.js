import {
    ERROR_CLASSES,
    SAME_ERROR_ESCALATE_AFTER,
    VALIDATOR_OUTCOMES,
} from './constants.js'
import { normalizeVfsPath, resolveVfsPath } from '../lib/vfs.js'

/**
 * Track consecutive Validation error-class fingerprints (shield 1).
 */
export function createErrorFingerprintTracker() {
    let lastClass = null
    let streak = 0

    function record(errorClass) {
        if (! errorClass) {
            lastClass = null
            streak = 0
            return { streak: 0, shouldEscalate: false }
        }
        if (errorClass === lastClass) {
            streak += 1
        } else {
            lastClass = errorClass
            streak = 1
        }
        return {
            streak,
            errorClass: lastClass,
            shouldEscalate: streak >= SAME_ERROR_ESCALATE_AFTER,
        }
    }

    function reset() {
        lastClass = null
        streak = 0
    }

    return { record, reset, peek: () => ({ lastClass, streak }) }
}

/**
 * Static + compile validation over Working VFS candidate.
 *
 * @param {{
 *   workingVfs: object,
 *   fingerprints: ReturnType<typeof createErrorFingerprintTracker>,
 *   compileProbe?: (() => Promise<{ ok: boolean, errors?: string[] }>)|null,
 *   abortSignal?: AbortSignal|null,
 * }} args
 */
export async function validateWorkingTree(args = {}) {
    const {
        workingVfs,
        fingerprints,
        compileProbe = null,
        abortSignal = null,
    } = args

    if (abortSignal?.aborted || workingVfs?.isDiscarded?.()) {
        return {
            outcome: VALIDATOR_OUTCOMES.ABORTED,
            errorClass: ERROR_CLASSES.ABORTED,
            warnings: [],
            errors: [],
            softPass: false,
        }
    }

    const ledger = workingVfs.diffLedger()
    const staticHit = runStaticChecks(ledger)

    if (staticHit) {
        const fp = fingerprints.record(staticHit.errorClass)
        if (fp.shouldEscalate) {
            return {
                outcome: VALIDATOR_OUTCOMES.SAME_ERROR_ESCALATE,
                errorClass: staticHit.errorClass,
                errors: [staticHit.message],
                warnings: [],
                softPass: false,
                escalateWriteMode: 'full',
            }
        }
        return {
            outcome: VALIDATOR_OUTCOMES.REPAIR,
            errorClass: staticHit.errorClass,
            errors: [staticHit.message],
            warnings: [],
            softPass: false,
        }
    }

    // Clear streak on clean static pass before optional compile probe.
    fingerprints.reset()

    if (abortSignal?.aborted || workingVfs?.isDiscarded?.()) {
        return {
            outcome: VALIDATOR_OUTCOMES.ABORTED,
            errorClass: ERROR_CLASSES.ABORTED,
            warnings: [],
            errors: [],
            softPass: false,
        }
    }

    let compile = { ok: true, errors: [], softPass: false, timedOut: false }
    if (typeof compileProbe === 'function') {
        try {
            const probed = await compileProbe()
            compile = {
                ok: probed?.ok !== false,
                errors: Array.isArray(probed?.errors) ? probed.errors.map(String) : [],
                softPass: Boolean(probed?.softPass),
                timedOut: Boolean(probed?.timedOut),
                warning: probed?.warning || null,
                outcome: probed?.outcome || null,
            }
        } catch (error) {
            compile = {
                ok: false,
                errors: [error?.message || 'Compile probe failed'],
                softPass: false,
                timedOut: false,
            }
        }
    }

    if (compile.outcome === 'aborted') {
        return {
            outcome: VALIDATOR_OUTCOMES.ABORTED,
            errorClass: ERROR_CLASSES.ABORTED,
            warnings: [],
            errors: [],
            softPass: false,
        }
    }

    if (compile.timedOut || compile.softPass) {
        // Soft-pass — does not fingerprint as Validation fail.
        return {
            outcome: VALIDATOR_OUTCOMES.PASS_WITH_WARNING,
            errorClass: null,
            errors: [],
            warnings: compile.warning ? [compile.warning] : [],
            softPass: true,
            compileTimedOut: true,
        }
    }

    if (! compile.ok) {
        const errorClass = classifyCompileErrors(compile.errors)
        const fp = fingerprints.record(errorClass)
        if (fp.shouldEscalate) {
            return {
                outcome: VALIDATOR_OUTCOMES.SAME_ERROR_ESCALATE,
                errorClass,
                errors: compile.errors,
                warnings: [],
                softPass: false,
                escalateWriteMode: 'full',
            }
        }
        return {
            outcome: VALIDATOR_OUTCOMES.REPAIR,
            errorClass,
            errors: compile.errors,
            warnings: [],
            softPass: false,
        }
    }

    fingerprints.reset()
    return {
        outcome: VALIDATOR_OUTCOMES.PASS,
        errorClass: null,
        errors: [],
        warnings: [],
        softPass: false,
    }
}

function runStaticChecks(ledger = []) {
    for (const row of ledger) {
        const body = row.after == null ? '' : String(row.after)
        const path = row.path || ''

        if (row.after == null) continue

        if (/\.(jsx|tsx)$/i.test(path)) {
            // Count real tag tokens, not raw angle brackets — comparison
            // operators (`i < steps.length`) and arrows (`=>`) must not skew
            // the balance. `<div` opens, `</div` closes, `/>` self-closes.
            const opens = (body.match(/<[A-Za-z]/g) || []).length
            const closes = (body.match(/<\/[A-Za-z]/g) || []).length
            const selfClosed = (body.match(/\/>/g) || []).length
            if (opens > closes + selfClosed + 3) {
                return {
                    errorClass: ERROR_CLASSES.UNCLOSED_TAG,
                    message: `Possible unclosed tag in ${path}`,
                }
            }
        }

        if (/\.(jsx?|tsx?)$/i.test(path)) {
            const importLines = body.split('\n').filter((line) => /^\s*import\s/.test(line))
            for (const raw of importLines) {
                const line = raw.replace(/\s\/\/.*$/, '').trim()
                if (! line || /import\s*\(/.test(line)) continue
                // No `from` clause: side-effect import or the first line of a
                // multi-line import (`import {`) — the bundler owns those.
                if (! /\bfrom\b/.test(line)) continue
                if (/from\s+['"][^'"]+['"];?$/.test(line)) continue
                return {
                    errorClass: ERROR_CLASSES.MISSING_IMPORT,
                    message: `Malformed import in ${path}`,
                }
            }
        }

        if (! body.trim() && /\.(jsx?|tsx?)$/i.test(path) && ! row.created) {
            return {
                errorClass: ERROR_CLASSES.VALIDATION,
                message: `Empty source file ${path}`,
            }
        }

        if (/\.css$/i.test(path) && /--spacing-(?:xs|sm|md|lg|xl|[2-7]xl)\b/.test(body)) {
            return {
                errorClass: ERROR_CLASSES.VALIDATION,
                message: `${path}: @theme spacing is --spacing: 0.25rem (the p-4 / max-w-2xl scale).`,
            }
        }

        if (/\.css$/i.test(path) && /--font-family-/.test(body)) {
            return {
                errorClass: ERROR_CLASSES.VALIDATION,
                message: `${path}: @theme font keys are --font-sans and --font-display.`,
            }
        }

        if (/\.css$/i.test(path) && /\*\s*\{[^}]*\b(?:padding|margin)\s*:\s*0/.test(body)) {
            return {
                errorClass: ERROR_CLASSES.VALIDATION,
                message: `${path}: Preflight is the reset. body { } paints tokens; * does not zero padding or margin.`,
            }
        }

        if (
            /\.css$/i.test(path)
            && /@theme\b/.test(body)
            && ! /@import\s+['"]tailwindcss['"]/.test(body)
        ) {
            return {
                errorClass: ERROR_CLASSES.VALIDATION,
                message: `${path}: @theme lives in src/index.css next to @import "tailwindcss".`,
            }
        }
    }
    return null
}

function classifyCompileErrors(errors = []) {
    const blob = (errors || []).join('\n').toLowerCase()
    if (blob.includes('import') || blob.includes('could not resolve')) {
        return ERROR_CLASSES.MISSING_IMPORT
    }
    if (blob.includes('unexpected') || blob.includes('jsx') || blob.includes('tag')) {
        return ERROR_CLASSES.UNCLOSED_TAG
    }
    return ERROR_CLASSES.COMPILE_FAILED
}

/**
 * Resolve a MissingImport / "Could not resolve" compile error into a VFS path
 * the agent should create (e.g. src/components/Footer.jsx).
 *
 * @param {string[]|string} errors
 * @returns {string|null}
 */
export function extractMissingImportPath(errors = []) {
    const blob = Array.isArray(errors)
        ? errors.map((row) => String(row || '')).join('\n')
        : String(errors || '')

    const resolveMatch = blob.match(
        /Could not resolve ["']([^"']+)["'](?: from ["']([^"']+)["'])?/i,
    )
    if (resolveMatch) {
        const spec = String(resolveMatch[1] || '').trim()
        const importer = String(resolveMatch[2] || '').trim()
        if (! spec || isBarePackageSpec(spec)) return null

        const importerDir = importer.includes('/')
            ? importer.replace(/\/[^/]*$/, '')
            : ''
        let resolved = spec.startsWith('/')
            ? normalizeVfsPath(spec)
            : resolveVfsPath(importerDir, spec)

        if (! resolved) return null
        if (! /\.[a-zA-Z0-9]+$/.test(resolved)) {
            resolved = `${resolved}.jsx`
        }
        return resolved
    }

    const missingMatch = blob.match(/File missing in VFS:\s*(\S+)/i)
    if (missingMatch) {
        return normalizeVfsPath(missingMatch[1]) || null
    }

    return null
}

function isBarePackageSpec(spec = '') {
    const value = String(spec || '').trim()
    if (! value) return true
    if (value.startsWith('.') || value.startsWith('/')) return false
    return true
}
