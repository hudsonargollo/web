/**
 * Detect bundler/build failures in guest dev-server terminal output and feed
 * them to the Lab error store, so the Fix-with-AI card appears the moment the
 * terminal shows a compile error — without waiting for a page reload.
 */

import { clearBuildError, setBuildError } from './labErrors'
import { isLabAiStreaming } from './labStreamState'

/** Strip ANSI color/control sequences from terminal chunks. */
export function stripAnsi(text = '') {
    // eslint-disable-next-line no-control-regex
    return String(text || '').replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')
}

const BUILD_ERROR_LINE = new RegExp([
    '\\[vite\\][^\\n]*(?:internal server error|failed to load|error when evaluating)',
    'pre-transform error',
    '\\[plugin:[^\\]]+\\]',
    'failed to resolve import',
    'failed to compile',
    'module not found',
    'transform failed with',
    '✘ \\[ERROR\\]',
    'rolluperror',
    '\\b(?:syntaxerror|referenceerror|typeerror)\\b(?=.*(?:src/|app/|pages/|components/))',
].join('|'), 'i')

const BUILD_RECOVERY_LINE = /\[vite\][^\n]*(?:hot updated|page reload)|ready in\s+\d|✓\s*built|compiled successfully|hmr update/i

const FILE_HINT = /((?:src|app|pages|components|lib|hooks)\/[\w./+-]+\.[a-zA-Z0-9]+)(?::(\d+))?(?::\d+)?/

/**
 * @param {string} chunk raw terminal output (may contain ANSI codes)
 * @returns {{ message: string, file: string|null, line: number|null } | null}
 */
export function detectGuestBuildError(chunk) {
    const text = stripAnsi(chunk)
    if (! text.trim()) return null

    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim()
        if (! line || ! BUILD_ERROR_LINE.test(line)) continue

        // Include a couple of follow-up lines — vite puts the file/frame there.
        const detail = lines.slice(i, i + 6).map((l) => l.trim()).filter(Boolean).join('\n')
        const hint = detail.match(FILE_HINT)
        return {
            message: detail,
            file: hint ? hint[1] : null,
            line: hint?.[2] ? Number(hint[2]) : null,
        }
    }
    return null
}

export function looksLikeGuestBuildRecovery(chunk) {
    return BUILD_RECOVERY_LINE.test(stripAnsi(chunk))
}

let reportTimer = 0

/**
 * Wire a dev-server output chunk into the Lab error store.
 * Debounced so multi-chunk error dumps produce one card update.
 */
export function trackGuestBuildOutput(chunk) {
    if (typeof window === 'undefined') return
    if (isLabAiStreaming()) return

    const hit = detectGuestBuildError(chunk)
    if (hit) {
        window.clearTimeout(reportTimer)
        reportTimer = window.setTimeout(() => {
            setBuildError({
                message: hit.message,
                file: hit.file,
                line: hit.line,
                source: 'dev-server',
            })
        }, 250)
        return
    }

    if (looksLikeGuestBuildRecovery(chunk)) {
        window.clearTimeout(reportTimer)
        reportTimer = 0
        clearBuildError()
    }
}
