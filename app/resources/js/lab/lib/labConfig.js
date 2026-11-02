/**
 * Lab bootstrap helpers (from #lab-config JSON in the page shell).
 */

export function readLabConfig() {
    try {
        const el = document.getElementById('lab-config')
        if (el?.textContent) {
            return JSON.parse(el.textContent) || {}
        }
    } catch {
        /* ignore */
    }
    return {}
}

/**
 * Import-from-GitHub UI (public URL always; account list needs OAuth).
 */
export function readLabGithubImportEnabled() {
    const config = readLabConfig()
    if (Object.prototype.hasOwnProperty.call(config, 'github_import')) {
        return Boolean(config.github_import)
    }

    return true
}

/** Workspace GitHub OAuth app is configured and enabled. */
export function readLabGithubOauthReady() {
    return Boolean(readLabConfig().github_oauth)
}

/** Demo installs: auto-click Switch when the build gate countdown ends. */
export function readLabAutoSwitchGate() {
    const config = readLabConfig()
    return {
        enabled: Boolean(config.auto_switch_gate),
        durationMs: Math.max(1000, Number(config.auto_switch_gate_ms) || 15_000),
    }
}
