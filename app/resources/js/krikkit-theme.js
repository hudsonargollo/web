const THEME_KEY = 'krikkit-theme'
const ACCENT_KEY = 'krikkit-theme-accent'
const BASE_KEY = 'krikkit-theme-base'
const STYLE_ID = 'krikkit-theme'
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const LIGHT_ACCENTS = new Set(['yellow', 'lime', 'amber'])

export function resolveMode() {
    const stored = localStorage.getItem(THEME_KEY)

    if (stored === 'dark' || stored === 'light') {
        return stored
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Plain browser CSS (no @theme — that is build-time only). */
export function themeCss(accent = 'base', base = 'neutral') {
    const lines = [':root {']

    if (base && base !== 'neutral') {
        for (const shade of SHADES) {
            lines.push(`    --color-neutral-${shade}: var(--color-${base}-${shade});`)
        }
    }

    if (! accent || accent === 'base') {
        lines.push('    --color-accent: var(--color-neutral-800);')
        lines.push('    --color-accent-content: var(--color-neutral-800);')
        lines.push('    --color-accent-foreground: var(--color-white);')
        lines.push('}')
        lines.push('.dark {')
        lines.push('    --color-accent: var(--color-white);')
        lines.push('    --color-accent-content: var(--color-white);')
        lines.push('    --color-accent-foreground: var(--color-neutral-900);')
        lines.push('}')
    } else if (LIGHT_ACCENTS.has(accent)) {
        lines.push(`    --color-accent: var(--color-${accent}-400);`)
        lines.push(`    --color-accent-content: var(--color-${accent}-700);`)
        lines.push('    --color-accent-foreground: var(--color-neutral-900);')
        lines.push('}')
        lines.push('.dark {')
        lines.push(`    --color-accent: var(--color-${accent}-400);`)
        lines.push(`    --color-accent-content: var(--color-${accent}-300);`)
        lines.push('    --color-accent-foreground: var(--color-neutral-900);')
        lines.push('}')
    } else {
        lines.push(`    --color-accent: var(--color-${accent}-500);`)
        lines.push(`    --color-accent-content: var(--color-${accent}-600);`)
        lines.push('    --color-accent-foreground: var(--color-white);')
        lines.push('}')
        lines.push('.dark {')
        lines.push(`    --color-accent: var(--color-${accent}-500);`)
        lines.push(`    --color-accent-content: var(--color-${accent}-400);`)
        lines.push('    --color-accent-foreground: var(--color-white);')
        lines.push('}')
    }

    return `${lines.join('\n')}\n`
}

function persistModeCookie(mode) {
    try {
        document.cookie = `${THEME_KEY}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax${
            location.protocol === 'https:' ? '; Secure' : ''
        }`
    } catch {
        // Ignore cookie failures (blocked storage, file://, …).
    }
}

function clearInlineThemeVars(root) {
    for (const shade of SHADES) {
        root.style.removeProperty(`--color-neutral-${shade}`)
    }
    root.style.removeProperty('--color-accent')
    root.style.removeProperty('--color-accent-content')
    root.style.removeProperty('--color-accent-foreground')
}

function paintCss(css) {
    // wire:navigate can append another #krikkit-theme when Blade CSS ≠ JS CSS.
    // Cascade uses the last tag; getElementById would only update the first.
    const existing = [...document.querySelectorAll(`style#${STYLE_ID}`)]
    let el = existing.pop() ?? null

    for (const stale of existing) {
        stale.remove()
    }

    if (! el) {
        el = document.createElement('style')
        el.id = STYLE_ID
    }

    el.textContent = css
    document.head.appendChild(el)
}

export function applyKrikkitTheme({
    mode = resolveMode(),
    accent = localStorage.getItem(ACCENT_KEY) || 'base',
    base = localStorage.getItem(BASE_KEY) || 'neutral',
    persist = true,
} = {}) {
    const root = document.documentElement
    const storedMode = mode === 'system' ? 'system' : (mode === 'dark' ? 'dark' : 'light')
    const nextMode = storedMode === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : storedMode
    const nextAccent = accent || 'base'
    const nextBase = base || 'neutral'

    clearInlineThemeVars(root)
    root.classList.toggle('dark', nextMode === 'dark')
    root.style.colorScheme = nextMode
    paintCss(themeCss(nextAccent, nextBase))

    if (persist) {
        localStorage.setItem(THEME_KEY, storedMode)
        localStorage.setItem(ACCENT_KEY, nextAccent)
        localStorage.setItem(BASE_KEY, nextBase)
        persistModeCookie(nextMode)
    }
}

export function readKrikkitTheme() {
    return {
        mode: resolveMode(),
        accent: localStorage.getItem(ACCENT_KEY) || 'base',
        base: localStorage.getItem(BASE_KEY) || 'neutral',
    }
}
