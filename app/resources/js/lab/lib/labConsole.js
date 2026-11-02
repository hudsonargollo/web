/**
 * Lab terminal copy from #lab-config.console (Settings → Lab console).
 */

import { readLabConfig } from './labConfig'

const fallbackLines = {
    waiting: '{name} · waiting for package.json…',
    no_package: '{name} · no package.json — skip auto install/dev',
    installing: '{name} · installing dependencies (lazy)…',
    ready: '{name} · dependencies ready',
    cache_hit: '{name} · node_modules cache hit — skip install',
    wasm_ready: '{name} · native WASM compiler binaries ready',
    no_script: '{name} · no scripts.dev / scripts.start — idle',
    auto_start: '{name} · auto-start {command}…',
    exited: '{name} · {command} exited ({code})',
    failed: '{name} · autostart failed: {error}',
    shell_unavailable: '{name} shell unavailable — local console only.',
}

function bootConsole() {
    const raw = readLabConfig().console
    return raw && typeof raw === 'object' ? raw : {}
}

export function labConsoleName() {
    const name = String(bootConsole().name || '').trim()
    return name || 'Krikkit Lab'
}

export function labConsoleSlug() {
    const slug = String(bootConsole().slug || '').trim()
    if (slug) return slug
    return labConsoleName().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lab'
}

export function labConsolePrompt() {
    return `\x1b[36m${labConsoleSlug()}\x1b[0m:\x1b[34m/\x1b[0m$ `
}

/**
 * @param {string} key
 * @param {{ command?: string, code?: string|number, error?: string }} [vars]
 */
export function labConsoleLine(key, vars = {}) {
    const boot = bootConsole()
    const lines = boot.lines && typeof boot.lines === 'object' ? boot.lines : {}
    const template = String(lines[key] || fallbackLines[key] || '').trim() || fallbackLines[key] || ''
    const values = {
        name: labConsoleName(),
        command: vars.command != null ? String(vars.command) : '',
        code: vars.code != null ? String(vars.code) : '',
        error: vars.error != null ? String(vars.error) : '',
    }

    return template.replace(/\{(name|command|code|error)\}/g, (_, token) => values[token] ?? '')
}
