/**
 * Centralized Lab error collector for Build (bundler) + Console (runtime) faults.
 * Tiny pub/sub store — no Zustand. React consumers use useErrorStore().
 */

import { isIgnorableGuestRuntimeError } from './previewGuestErrors.js'

const MAX_CONSOLE_ERRORS = 12

const listeners = new Set()

let state = {
    /** @type {null | LabBuildError} */
    buildError: null,
    /** @type {LabConsoleError[]} */
    consoleErrors: [],
    /** Temporarily hide the Action Card without clearing errors. */
    dismissed: false,
}

/**
 * @typedef {{
 *   message: string,
 *   stack?: string | null,
 *   file?: string | null,
 *   line?: number | null,
 *   source?: string | null,
 *   at: number,
 * }} LabBuildError
 */

/**
 * @typedef {{
 *   id: string,
 *   message: string,
 *   stack?: string | null,
 *   file?: string | null,
 *   line?: number | null,
 *   source?: string | null,
 *   category?: 'RUNTIME_ERROR' | string | null,
 *   at: number,
 * }} LabConsoleError
 */

function emit() {
    for (const listener of listeners) {
        try {
            listener(state)
        } catch {
            /* ignore subscriber faults */
        }
    }
}

function setState(next) {
    state = next
    emit()
}

function uid(prefix = 'err') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Pull `file:line:col` origin from esbuild-style messages when present. */
export function extractErrorOrigin(message = '') {
    const text = String(message || '')
    const match = text.match(/^([^\s:—-][^:\n]*\.[a-zA-Z0-9]+)(?::(\d+))?(?::(\d+))?/)
    if (! match) {
        return { file: null, line: null, column: null }
    }
    return {
        file: cleanErrorFile(match[1]),
        line: match[2] ? Number(match[2]) : null,
        column: match[3] ? Number(match[3]) : null,
    }
}

/**
 * Strip preview/CDN noise from error text (`about:srcdoc`, blob:, esm.sh, …).
 */
export function scrubErrorNoise(text = '') {
    let out = String(text ?? '')
    out = out.replace(/\babout:srcdoc\b[:\s]*/gi, '')
    out = out.replace(/\bblob:[^\s)\]'"]+/gi, '')
    out = out.replace(/\bhttps?:\/\/[^\s)\]'"]+/gi, '')
    out = out.replace(/\b(?:cdn\.jsdelivr\.net|unpkg\.com|esm\.sh|ga\.jspm\.io)\/[^\s)\]'"]+/gi, '')
    // Drop leftover empty parens / brackets from scrubbed URLs.
    out = out.replace(/\(\s*\)/g, '')
    out = out.replace(/\[\s*\]/g, '')
    out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    out = out.replace(/[ \t]{2,}/g, ' ').trim()
    return out
}

const SOURCE_EXT = /\.(?:jsx?|tsx?|vue|svelte|css|html|mjs|cjs)$/i
const PROJECT_DIR = /(?:^|\/)((?:src|app|pages|components|lib|hooks)\/[\w./+-]+\.[a-zA-Z0-9]+)/

/** Keep only a useful VFS-ish path; drop srcdoc / absolute CDN noise. */
export function cleanErrorFile(file = '') {
    let value = String(file ?? '').trim()
    if (! value) return null
    if (/^about:srcdoc/i.test(value)) return null
    if (/^(blob:|https?:)/i.test(value)) {
        // Remote / blob URLs are never useful as the card file chip.
        return null
    }
    value = value.replace(/^\/+/, '')
    if (value.includes('node_modules')) return null

    const projectPath = value.match(PROJECT_DIR)
    if (projectPath) return projectPath[1]

    // Bare filenames only when they look like app sources (App.jsx), not react.mjs.
    const bare = value.match(/^([A-Za-z][\w.-]*\.(?:jsx|tsx|vue|svelte|css|html))$/)
    if (bare) return bare[1]

    if (value.includes('/') && SOURCE_EXT.test(value) && ! /\.mjs$/i.test(value)) {
        return value
    }
    return null
}

/** Known React / scheduler internals (readable production & development names). */
const REACT_INTERNAL_FNS = new Set([
    'renderWithHooks',
    'updateFunctionComponent',
    'updateSimpleMemoComponent',
    'mountIndeterminateComponent',
    'beginWork',
    'beginWork$1',
    'performUnitOfWork',
    'workLoopSync',
    'workLoopConcurrent',
    'renderRootSync',
    'renderRootConcurrent',
    'performSyncWorkOnRoot',
    'performConcurrentWorkOnRoot',
    'flushSyncWorkAcrossRoots_impl',
    'flushSyncWorkOnAllRoots',
    'commitRoot',
    'commitRootImpl',
    'commitMutationEffects',
    'commitLayoutEffects',
    'commitPassiveMountOnFiber',
    'recursivelyTraversePassiveMountEffects',
    'flushPassiveEffects',
    'flushPassiveEffectsImpl',
    'scheduleUpdateOnFiber',
    'ensureRootIsScheduled',
    'processDispatchQueue',
    'dispatchEvent',
    'dispatchDiscreteEvent',
    'invokeGuardedCallback',
    'invokeGuardedCallbackDev',
    'callCallback',
    'Object.then',
    'HTMLUnknownElement.send',
])

/** Minified react-dom/react names: `ie`, `Ec`, `K1`, `yv`, `Yy`. */
function isMinifiedFrameName(name = '') {
    const value = String(name || '').trim()
    if (! value) return false
    if (/^[a-z]$/.test(value)) return true
    if (/^[a-z]{2}$/.test(value)) return true
    if (/^[A-Z][a-z]$/.test(value)) return true
    if (/^[A-Za-z]{1,2}\d+$/.test(value)) return true
    if (/^[A-Z][a-z]\d*$/.test(value) && value.length <= 3) return true
    return false
}

function isUserComponentName(name = '') {
    const value = String(name || '').trim()
    // PascalCase app components — RecentOrdersCard, App, LandingPage
    if (! /^[A-Z][A-Za-z0-9_$]*$/.test(value)) return false
    if (value.length < 2) return false
    if (isMinifiedFrameName(value)) return false
    if (REACT_INTERNAL_FNS.has(value)) return false
    return true
}

function isFrameworkLocation(loc = '') {
    const value = String(loc || '')
    if (! value) return false
    if (/about:srcdoc/i.test(value)) return true
    if (/^(blob:|https?:)/i.test(value)) return true
    if (/(scheduler|react-dom|react\.production|react\.development|react\.mjs|react-jsx|\.mjs\b|chunk-|node_modules)/i.test(value)) {
        return true
    }
    // Bare bundled offsets: (608:86)
    if (/^\d+:\d+(?::\d+)?$/.test(value.trim())) return true
    return false
}

function guessFileFromComponent(name = '') {
    const value = String(name || '').trim()
    if (! isUserComponentName(value)) return null
    if (value === 'App') return 'src/App.jsx'
    // Prefer components/ — Lab kits keep leaf UI there more often than src/Name.jsx.
    return `src/components/${value}.jsx`
}

const FRAME_PATH_RE = /((?:src|app|pages|components|lib|hooks)\/[\w./+-]+\.[a-zA-Z0-9]+|[A-Za-z][\w.-]*\.(?:jsx|tsx|vue|svelte))(?::(\d+))?(?::\d+)?/

/**
 * Parse a single `at …` stack line into { name, file, line, rawLoc }.
 */
export function parseStackFrame(line = '') {
    const text = String(line || '').trim()
    if (! text.startsWith('at ')) return null

    // at Name (loc)  |  at async Name (loc)
    const withLoc = text.match(/^at\s+(?:async\s+)?([^\s(]+)\s+\((.+)\)$/)
    if (withLoc) {
        const name = withLoc[1] === 'Object.<anonymous>' ? null : withLoc[1]
        const loc = withLoc[2]
        const pathMatch = String(loc).match(FRAME_PATH_RE)
        return {
            name,
            file: pathMatch ? cleanErrorFile(pathMatch[1]) : cleanErrorFile(loc),
            line: pathMatch?.[2] ? Number(pathMatch[2]) : null,
            rawLoc: loc,
        }
    }

    // at src/App.jsx:12:3  |  at RecentOrdersCard
    const bare = text.match(/^at\s+(?:async\s+)?(.+)$/)
    if (! bare) return null
    const rest = bare[1].trim()
    const pathMatch = rest.match(FRAME_PATH_RE)
    if (pathMatch) {
        return {
            name: null,
            file: cleanErrorFile(pathMatch[1]),
            line: pathMatch[2] ? Number(pathMatch[2]) : null,
            rawLoc: rest,
        }
    }
    return {
        name: rest,
        file: null,
        line: null,
        rawLoc: null,
    }
}

function isFrameworkFrame(frame) {
    if (! frame) return true
    const name = frame.name || ''
    if (name && REACT_INTERNAL_FNS.has(name)) return true
    if (name && isMinifiedFrameName(name)) return true
    if (name && /^(react|scheduler|jsx|jsxs|jsxDEV)/i.test(name)) return true
    if (frame.rawLoc && isFrameworkLocation(frame.rawLoc) && ! frame.file && ! isUserComponentName(name)) {
        return true
    }
    // Bare bundle offset with minified/empty name
    if (frame.rawLoc && /^\d+:\d+(?::\d+)?$/.test(String(frame.rawLoc).trim())) return true
    return false
}

function isUserFrame(frame) {
    if (! frame || isFrameworkFrame(frame)) return false
    if (isUserComponentName(frame.name)) return true
    if (frame.file) return true
    return false
}

/**
 * Format a stack like the browser console — header + user component frames only.
 *
 * @example
 * TypeError: Cannot read properties of undefined (reading 'map')
 *     at RecentOrdersCard (src/App.jsx)
 */
export function formatConsoleStack(rawStack = '', options = {}) {
    const text = String(rawStack || '')
    const lines = text.split(/\r?\n/)
    let header = scrubErrorNoise((lines[0] || '').trim())
    if (! header || /^at\s+/.test(header)) {
        header = scrubErrorNoise(String(options.message || '').split('\n')[0] || '') || 'Error'
    } else if (header.includes(' at ')) {
        // Sometimes message and first frame share one line.
        header = scrubErrorNoise(header.split(/\s+at\s+/)[0]) || header
    }

    /** @type {{ name: string | null, file: string | null, line: number | null }[]} */
    const userFrames = []
    for (const line of lines.slice(header === scrubErrorNoise((lines[0] || '').trim()) ? 1 : 0)) {
        const trimmed = line.trim()
        if (! trimmed.startsWith('at ')) continue
        const frame = parseStackFrame(trimmed)
        if (! isUserFrame(frame)) continue

        let file = frame.file || null
        // Drop useless bundle offsets; keep VFS path. Infer path from component when needed.
        if (! file && isUserComponentName(frame.name)) {
            file = cleanErrorFile(options.file) || guessFileFromComponent(frame.name)
        }

        userFrames.push({
            name: isUserComponentName(frame.name) ? frame.name : null,
            file,
            // Never show raw bundled offsets; omit line unless it came from a real VFS path frame.
            line: frame.file && frame.line != null ? frame.line : null,
        })
    }

    // Deduplicate identical component/file rows.
    const seen = new Set()
    const unique = []
    for (const frame of userFrames) {
        const key = `${frame.name || ''}|${frame.file || ''}`
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(frame)
    }

    // Fallback: no user frames parsed — still surface component/file hints.
    if (! unique.length) {
        const fallbackName = isUserComponentName(options.component) ? options.component : null
        const fallbackFile = cleanErrorFile(options.file) || (fallbackName ? guessFileFromComponent(fallbackName) : null)
        if (fallbackName || fallbackFile) {
            unique.push({ name: fallbackName, file: fallbackFile, line: null })
        }
    }

    const body = unique.map((frame) => {
        if (frame.name && frame.file) {
            // Console-like: component + VFS path (no bundled 608:86 offsets).
            return `    at ${frame.name} (${frame.file})`
        }
        if (frame.name) return `    at ${frame.name}`
        if (frame.file) return `    at ${frame.file}`
        return null
    }).filter(Boolean)

    return [header, ...body].join('\n')
}

function extractFileFromStack(stack = '') {
    const formatted = formatConsoleStack(stack)
    const match = formatted.match(/\(((?:src|app|pages|components|lib|hooks)\/[^)\s]+|[A-Za-z][\w.-]*\.(?:jsx|tsx|vue|svelte))\)/)
    if (match) {
        return { file: cleanErrorFile(match[1]), line: null }
    }
    return { file: null, line: null }
}

function extractComponentFromStack(stack = '') {
    const formatted = formatConsoleStack(stack)
    const match = formatted.match(/^\s*at\s+([A-Z][A-Za-z0-9_$]*)\s*(?:\(|$)/m)
    return match ? match[1] : null
}

function normalizeMessage(value) {
    const text = scrubErrorNoise(String(value ?? '').trim())
    return text || 'Unknown error'
}

/**
 * Presentation fields for the Action Card — clean title, file chip, console-like detail.
 */
export function presentLabError(target) {
    if (! target) {
        return {
            title: '',
            file: null,
            line: null,
            component: null,
            detail: '',
            badge: 'Error',
        }
    }

    const rawMessage = String(target.message || '')
    const rawStack = String(target.stack || rawMessage)
    const firstLine = scrubErrorNoise(rawMessage.split('\n')[0] || '')
    const detail = formatConsoleStack(rawStack, {
        message: firstLine,
        file: target.file,
        component: target.component,
    })
    const detailLines = detail.split('\n')
    const title = scrubErrorNoise(detailLines[0] || firstLine) || 'Unknown error'
    const component = extractComponentFromStack(detail)
        || (isUserComponentName(target.component) ? target.component : null)
    const fromStack = extractFileFromStack(detail)
    const file = cleanErrorFile(target.file) || fromStack.file
        || (component ? guessFileFromComponent(component) : null)

    return {
        title,
        file,
        line: null,
        component,
        detail,
        badge: target.badge
            || (target.type === 'BUILD_ERROR' ? 'Build Failure' : 'Runtime Error'),
    }
}

function normalizeBuildPayload(payload) {
    if (payload == null) return null
    if (typeof payload === 'string') {
        const message = normalizeMessage(payload)
        const origin = extractErrorOrigin(message)
        return {
            message,
            stack: null,
            file: origin.file,
            line: origin.line,
            source: 'bundler',
            at: Date.now(),
        }
    }

    const message = normalizeMessage(payload.message || payload.text || '')
    const origin = extractErrorOrigin(message)
    return {
        message,
        stack: payload.stack ? String(payload.stack) : null,
        file: payload.file || origin.file || null,
        line: payload.line != null ? Number(payload.line) : origin.line,
        source: payload.source || 'bundler',
        at: Date.now(),
    }
}

function normalizeConsolePayload(payload) {
    if (payload == null) return null
    if (typeof payload === 'string') {
        const message = normalizeMessage(payload)
        if (isIgnorableGuestRuntimeError(message)) return null
        const origin = extractErrorOrigin(message)
        return {
            id: uid('console'),
            message,
            stack: null,
            file: origin.file,
            line: origin.line,
            source: 'runtime',
            category: 'RUNTIME_ERROR',
            at: Date.now(),
        }
    }

    const message = normalizeMessage(payload.message || payload.text || '')
    if (isIgnorableGuestRuntimeError(message, payload.stack)) return null
    const origin = extractErrorOrigin(message)
    return {
        id: payload.id || uid('console'),
        message,
        stack: payload.stack ? String(payload.stack) : null,
        file: payload.file || origin.file || null,
        line: payload.line != null ? Number(payload.line) : origin.line,
        component: payload.component || null,
        source: payload.source || 'runtime',
        category: payload.category || 'RUNTIME_ERROR',
        at: Date.now(),
    }
}

export function getLabErrors() {
    return state
}

export function subscribeLabErrors(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function setBuildError(payload) {
    const next = normalizeBuildPayload(payload)
    if (! next) return
    setState({
        ...state,
        buildError: next,
        dismissed: false,
    })
}

export function clearBuildError() {
    if (! state.buildError) return
    setState({
        ...state,
        buildError: null,
    })
}

export function addConsoleError(payload) {
    const row = normalizeConsolePayload(payload)
    if (! row) return

    // Dedupe identical consecutive messages to avoid console spam floods.
    const last = state.consoleErrors[state.consoleErrors.length - 1]
    if (last && last.message === row.message && last.file === row.file) {
        return
    }

    const consoleErrors = [...state.consoleErrors, row].slice(-MAX_CONSOLE_ERRORS)
    setState({
        ...state,
        consoleErrors,
        dismissed: false,
    })
}

export function clearConsoleErrors() {
    if (! state.consoleErrors.length) return
    setState({
        ...state,
        consoleErrors: [],
    })
}

/** Clear the active error bucket used by the Action Card (build wins). */
export function clearActiveErrors() {
    if (state.buildError) {
        setState({
            ...state,
            buildError: null,
            dismissed: false,
        })
        return
    }
    if (state.consoleErrors.length) {
        setState({
            ...state,
            consoleErrors: [],
            dismissed: false,
        })
    }
}

export function clearAllLabErrors() {
    if (! state.buildError && ! state.consoleErrors.length && ! state.dismissed) return
    setState({
        buildError: null,
        consoleErrors: [],
        dismissed: false,
    })
}

/** Hide the Action Card without clearing collected errors. */
export function dismissErrorCard() {
    if (state.dismissed) return
    setState({
        ...state,
        dismissed: true,
    })
}

export function hasActiveLabErrors(snapshot = state) {
    return Boolean(snapshot.buildError) || snapshot.consoleErrors.length > 0
}

/**
 * Snapshot for the Fix-with-AI repair turn.
 * Build failures take precedence over runtime/console errors.
 * Never collapses extras into "(+N more)" — callers get a full `errors` list.
 */
export function activeRepairTarget(snapshot = state) {
    if (snapshot.buildError) {
        const presented = presentLabError({
            type: 'BUILD_ERROR',
            badge: 'Build Failure',
            message: snapshot.buildError.message,
            stack: snapshot.buildError.stack,
            file: snapshot.buildError.file,
            line: snapshot.buildError.line,
        })
        const entry = {
            message: presented.title,
            stack: presented.detail,
            file: presented.file,
            line: presented.line ?? snapshot.buildError.line ?? null,
            component: presented.component,
        }
        return {
            type: 'BUILD_ERROR',
            badge: presented.badge,
            message: presented.title,
            stack: presented.detail,
            file: presented.file,
            line: entry.line,
            component: presented.component,
            errors: [entry],
            rawMessage: snapshot.buildError.message,
            rawStack: snapshot.buildError.stack || snapshot.buildError.message,
        }
    }

    if (! snapshot.consoleErrors.length) return null

    const errors = snapshot.consoleErrors.map((row) => {
        const presented = presentLabError({
            type: 'RUNTIME_ERROR',
            badge: 'Runtime Error',
            message: row.message,
            stack: row.stack || row.message,
            file: row.file,
            line: row.line,
            component: row.component,
        })
        return {
            message: presented.title,
            stack: presented.detail,
            file: presented.file,
            line: presented.line ?? row.line ?? null,
            component: presented.component,
        }
    })
    const primary = errors[0]

    return {
        type: 'RUNTIME_ERROR',
        badge: 'Runtime Error',
        message: primary.message,
        stack: primary.stack,
        file: primary.file,
        line: primary.line,
        component: primary.component,
        errors,
        errorCount: errors.length,
        rawMessage: snapshot.consoleErrors[0].message,
        rawStack: snapshot.consoleErrors[0].stack || snapshot.consoleErrors[0].message,
    }
}

/** Display + transport metadata for an AUTO_REPAIR turn (never shown as raw SYSTEM text). */
export function buildAutoRepairMeta(target) {
    if (! target) return null
    if (target.type === 'AUTO_REPAIR' && target.errorType) {
        return {
            type: 'AUTO_REPAIR',
            errorType: target.errorType === 'BUILD_ERROR' ? 'BUILD_ERROR' : 'RUNTIME_ERROR',
            message: String(target.message || 'Unknown error'),
            stack: String(target.stack || target.message || ''),
            file: target.file || null,
            component: target.component || null,
            line: target.line ?? null,
            errors: Array.isArray(target.errors) ? target.errors : undefined,
            targets: Array.isArray(target.targets) ? target.targets : undefined,
            subtitle: target.subtitle
                || (target.errorType === 'BUILD_ERROR'
                    ? 'Fixing build failure…'
                    : 'Fixing runtime rendering crash…'),
        }
    }
    const errorType = target.type === 'BUILD_ERROR' ? 'BUILD_ERROR' : 'RUNTIME_ERROR'
    const errors = Array.isArray(target.errors) && target.errors.length
        ? target.errors
        : [{
            message: String(target.message || 'Unknown error'),
            stack: String(target.stack || target.message || ''),
            file: target.file || null,
            line: target.line ?? null,
            component: target.component || null,
        }]
    return {
        type: 'AUTO_REPAIR',
        errorType,
        message: String(target.message || 'Unknown error'),
        stack: String(target.stack || target.message || ''),
        file: target.file || null,
        component: target.component || null,
        line: target.line ?? null,
        errors,
        targets: [...new Set(errors.map((row) => row.file).filter(Boolean))],
        subtitle: errorType === 'BUILD_ERROR'
            ? 'Fixing build failure…'
            : (errors.length > 1
                ? `Fixing ${errors.length} runtime errors…`
                : 'Fixing runtime rendering crash…'),
    }
}

/** Exact orchestrator prompt for a user-triggered repair turn (hidden LLM payload). */
export function buildAutoRepairPrompt(target) {
    if (! target) return ''
    const errorTypeRaw = target.errorType || target.type || 'RUNTIME_ERROR'
    const errorType = errorTypeRaw === 'BUILD_ERROR' ? 'BUILD_ERROR' : 'RUNTIME_ERROR'
    const phaseNote = errorType === 'BUILD_ERROR'
        ? 'The in-browser bundler failed while compiling the VFS snapshot (syntax/import/build error).'
        : 'The project compiled successfully. This error occurred later at RUNTIME during React render/execution inside the preview — it is NOT a bundler/compile failure.'

    const errors = Array.isArray(target.errors) && target.errors.length
        ? target.errors
        : [{
            message: target.message,
            file: target.file,
            line: target.line,
            component: target.component,
            stack: target.stack,
        }]
    const targets = Array.isArray(target.targets) && target.targets.length
        ? target.targets
        : [...new Set(errors.map((row) => row.file).filter(Boolean))]

    const lines = [
        '[SYSTEM AUTO-REPAIR REQUEST]',
        `Type: ${errorType}`,
        phaseNote,
        `Target File(s): ${targets.join(', ') || target.file || 'src/App.jsx'}`,
        '',
        '[ACTIVE RUNTIME ERRORS]',
    ]
    errors.forEach((row, index) => {
        const loc = row.file
            ? (row.line != null ? `${row.file}:${row.line}` : row.file)
            : 'unknown'
        const component = row.component ? ` (${row.component})` : ''
        lines.push(`- Error ${index + 1}: ${row.message || 'Unknown error'} at ${loc}${component}`)
    })
    if (errors[0]?.stack || target.stack) {
        lines.push('', '[PRIMARY STACK]', String(errors[0]?.stack || target.stack))
    }
    lines.push(
        '',
        '[CONSTRAINTS]',
        '- Surgical fix only: change the minimum lines needed for the listed errors.',
        '- Use write_file with the complete updated file body (atomic overwrite). There is no apply_patch tool.',
        '- Do NOT delete unrelated imports, routes, or pages (e.g. HomePage, SignupPage) unless required to fix a listed error.',
        '- Do NOT rewrite whole files for a one-line null/undefined crash.',
        '- Only edit Target File(s) unless another file is strictly required by a listed error.',
        '- Fix the broken file(s) in VFS immediately using write_file.',
    )
    return lines.join('\n')
}

/** True when persisted user content is a raw auto-repair dump (legacy / hydrate). */
export function isAutoRepairPromptText(text = '') {
    return String(text || '').trimStart().startsWith('[SYSTEM AUTO-REPAIR REQUEST]')
}

export function parseAutoRepairFromPrompt(text = '') {
    if (! isAutoRepairPromptText(text)) return null
    const body = String(text)
    const typeMatch = body.match(/^Type:\s*(\S+)/m)
    const messageMatch = body.match(/^Error Message:\s*(.+)$/m)
    const stackMatch = body.match(/^Stack \/ Location:\s*([\s\S]*?)(?:\n\nFix the broken|$)/m)
        || body.match(/^\[PRIMARY STACK\]\s*\n([\s\S]*?)(?:\n\n\[CONSTRAINTS\]|$)/m)
    const componentMatch = body.match(/^Component:\s*(.+)$/m)
    const fileMatch = body.match(/^File:\s*(.+)$/m)
        || body.match(/^Target File\(s\):\s*(.+)$/m)
    const errorType = typeMatch?.[1] === 'BUILD_ERROR' ? 'BUILD_ERROR' : 'RUNTIME_ERROR'

    const errors = []
    const activeBlock = body.match(/\[ACTIVE RUNTIME ERRORS\]\s*\n([\s\S]*?)(?:\n\n\[|$)/)
    if (activeBlock) {
        for (const line of activeBlock[1].split('\n')) {
            const row = line.match(/^-\s*Error\s+\d+:\s*(.+?)\s+at\s+(\S+?)(?:\s+\(([^)]+)\))?$/)
            if (! row) continue
            const loc = row[2]
            const [pathPart, linePart] = loc.includes(':')
                ? [loc.replace(/:\d+$/, ''), loc.match(/:(\d+)$/)?.[1]]
                : [loc, null]
            errors.push({
                message: row[1].trim(),
                file: pathPart === 'unknown' ? null : pathPart,
                line: linePart != null ? Number(linePart) : null,
                component: row[3]?.trim() || null,
            })
        }
    }

    const primaryFile = fileMatch?.[1]?.split(',')[0]?.trim() || errors[0]?.file || null
    return buildAutoRepairMeta({
        type: errorType,
        message: messageMatch?.[1]?.trim() || errors[0]?.message || 'Unknown error',
        stack: stackMatch?.[1]?.trim() || '',
        component: componentMatch?.[1]?.trim() || errors[0]?.component || null,
        file: primaryFile,
        errors: errors.length ? errors : undefined,
    })
}

/** Compact summary for the Action Card (no hard mid-string ellipsis cut). */
export function summarizeLabError(target) {
    const presented = presentLabError(target)
    if (! presented.title) return ''
    if (presented.component && presented.file) {
        return `${presented.title} · ${presented.component} (${presented.file})`
    }
    if (presented.file) return `${presented.title} · ${presented.file}`
    if (presented.component) return `${presented.title} · ${presented.component}`
    return presented.title
}

/** Test helper — reset singleton between suites. */
export function __resetLabErrorsForTests() {
    state = {
        buildError: null,
        consoleErrors: [],
        dismissed: false,
    }
    emit()
}
