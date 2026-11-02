/**
 * Lab JSX modules must satisfy both import styles:
 *   import Hero from './Hero'
 *   import { Hero } from './Hero'
 *
 * `export default function Hero` is a default export only — Vite then throws
 * "does not provide an export named 'Hero'". Dual-export on every write.
 */

const JSX_PATH = /\.(jsx|tsx)$/i

/**
 * @param {string} path
 * @param {string} raw
 * @returns {{ body: string, changed: boolean }}
 */
export function ensureDualComponentExport(path = '', raw = '') {
    if (! JSX_PATH.test(String(path || ''))) {
        return { body: String(raw ?? ''), changed: false }
    }
    const text = String(raw ?? '')
    if (! text.trim()) return { body: text, changed: false }

    const defaultFn = text.match(
        /\bexport\s+default\s+((?:async\s+)?function(?:\s*\*)?\s+)([A-Za-z_$][\w$]*)/,
    )
    if (defaultFn) {
        const name = defaultFn[2]
        if (hasNamedExport(text, name)) {
            return { body: text, changed: false }
        }
        let next = text.replace(
            /\bexport\s+default\s+((?:async\s+)?function(?:\s*\*)?\s+)([A-Za-z_$][\w$]*)/,
            'export $1$2',
        )
        if (! /\bexport\s+default\b/.test(next)) {
            next = `${next.replace(/\s*$/, '')}\n\nexport default ${name}\n`
        }
        return { body: next, changed: next !== text }
    }

    const defaultId = matchDefaultIdentifier(text)
    if (defaultId && ! hasNamedExport(text, defaultId)) {
        const next = `${text.replace(/\s*$/, '')}\nexport { ${defaultId} }\n`
        return { body: next, changed: true }
    }

    const stem = fileStem(path)
    if (stem && hasNamedExport(text, stem) && ! /\bexport\s+default\b/.test(text)) {
        const next = `${text.replace(/\s*$/, '')}\n\nexport default ${stem}\n`
        return { body: next, changed: true }
    }

    return { body: text, changed: false }
}

/**
 * Add a missing named or default export for a specific symbol (topology heal).
 *
 * @param {string} source
 * @param {{ symbol: string, kind: string }} mismatch
 * @returns {{ body: string, changed: boolean }}
 */
export function healExportMismatch(source = '', mismatch = {}) {
    const text = String(source ?? '')
    const symbol = String(mismatch.symbol || '').trim()
    const kind = String(mismatch.kind || '')
    if (! text.trim() || ! /^[A-Za-z_$][\w$]*$/.test(symbol) || symbol === 'default') {
        if (kind === 'default' || symbol === 'default') {
            return ensureDefaultFromNamed(text)
        }
        return { body: text, changed: false }
    }

    if (kind === 'named' || kind === '') {
        if (hasNamedExport(text, symbol)) return { body: text, changed: false }
        const dual = ensureDualComponentExport('Component.jsx', text)
        if (dual.changed && hasNamedExport(dual.body, symbol)) return dual
        if (/\bexport\s+default\b/.test(text)) {
            const next = `${text.replace(/\s*$/, '')}\nexport { ${symbol} }\n`
            return { body: next, changed: true }
        }
    }

    if (kind === 'default') {
        return ensureDefaultFromNamed(text, symbol)
    }

    return { body: text, changed: false }
}

function ensureDefaultFromNamed(text, prefer = '') {
    if (/\bexport\s+default\b/.test(text)) {
        return { body: text, changed: false }
    }
    const name = prefer && hasNamedExport(text, prefer)
        ? prefer
        : firstNamedFunction(text)
    if (! name) return { body: text, changed: false }
    const next = `${text.replace(/\s*$/, '')}\n\nexport default ${name}\n`
    return { body: next, changed: true }
}

function matchDefaultIdentifier(text) {
    const match = String(text).match(/\bexport\s+default\s+([A-Za-z_$][\w$]*)\s*;?/)
    if (! match) return null
    const name = match[1]
    if (name === 'function' || name === 'class' || name === 'async') return null
    return name
}

function hasNamedExport(text, name) {
    const stripped = String(text).replace(
        /\bexport\s+default\s+(?:async\s+)?function(?:\s*\*)?\s+[A-Za-z_$][\w$]*/g,
        '',
    )
    if (new RegExp(`\\bexport\\s+(?:async\\s+)?function(?:\\s*\\*)?\\s+${name}\\b`).test(stripped)) {
        return true
    }
    if (new RegExp(`\\bexport\\s+(?:const|let|var|class)\\s+${name}\\b`).test(stripped)) {
        return true
    }
    const listRe = /\bexport\s*\{([^}]+)\}/g
    let match
    while ((match = listRe.exec(stripped)) !== null) {
        for (const part of String(match[1] || '').split(',')) {
            const trimmed = part.trim()
            if (! trimmed) continue
            const alias = trimmed.match(/^(?:type\s+)?([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/)
            if (alias && alias[2] === name) return true
            if (trimmed === name || trimmed === `type ${name}`) return true
        }
    }
    return false
}

function firstNamedFunction(text) {
    const match = String(text).match(
        /\bexport\s+(?:async\s+)?function(?:\s*\*)?\s+([A-Za-z_$][\w$]*)/,
    )
    return match ? match[1] : null
}

function fileStem(path) {
    const base = String(path || '').replace(/\\/g, '/').split('/').pop() || ''
    return base.replace(/\.[^.]+$/, '')
}
