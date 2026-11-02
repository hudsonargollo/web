/**
 * Mermaid cannot parse oklch()/lab() from Tailwind v4 tokens.
 * Resolve CSS variables → #rrggbb before handing them to Mermaid.
 */

const FALLBACK = {
    light: {
        fg: '#18181b',
        fgSoft: '#3f3f46',
        muted: '#71717a',
        subtle: '#a1a1aa',
        canvas: '#fafafa',
        surface: '#ffffff',
        soft: '#f4f4f5',
        line: '#e4e4e7',
        accent: '#27272a',
        onAccent: '#fafafa',
    },
    dark: {
        fg: '#fafafa',
        fgSoft: '#d4d4d8',
        muted: '#a1a1aa',
        subtle: '#71717a',
        canvas: '#09090b',
        surface: '#18181b',
        soft: '#27272a',
        line: '#3f3f46',
        accent: '#fafafa',
        onAccent: '#18181b',
    },
}

let probeCtx = null

function getProbeContext() {
    if (typeof document === 'undefined') return null
    if (probeCtx) return probeCtx
    try {
        probeCtx = document.createElement('canvas').getContext('2d')
    } catch {
        probeCtx = null
    }
    return probeCtx
}

/** Convert any CSS color Mermaid rejects into #rrggbb. */
export function toMermaidHex(input, fallback = '#18181b') {
    const raw = String(input || '').trim()
    if (! raw) return fallback

    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase()
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
        const [r, g, b] = raw.slice(1)
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    }

    const fromRgb = rgbStringToHex(raw)
    if (fromRgb) return fromRgb

    const ctx = getProbeContext()
    if (ctx) {
        try {
            ctx.fillStyle = '#012345'
            ctx.fillStyle = raw
            const normalized = String(ctx.fillStyle || '')
            if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized.toLowerCase()
            const fromCanvasRgb = rgbStringToHex(normalized)
            if (fromCanvasRgb) return fromCanvasRgb
        } catch {
            /* unsupported color */
        }
    }

    // Last resort: element computed style → rgb()
    if (typeof document !== 'undefined') {
        try {
            const el = document.createElement('span')
            el.style.color = raw
            el.style.position = 'fixed'
            el.style.left = '-9999px'
            document.documentElement.appendChild(el)
            const computed = getComputedStyle(el).color
            el.remove()
            const hex = rgbStringToHex(computed)
            if (hex) return hex
        } catch {
            /* ignore */
        }
    }

    return fallback
}

function rgbStringToHex(value) {
    const match = String(value || '').match(
        /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i,
    )
    if (! match) return null
    const r = Math.round(Number(match[1]))
    const g = Math.round(Number(match[2]))
    const b = Math.round(Number(match[3]))
    if ([r, g, b].some((n) => Number.isNaN(n))) return null
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

function readTokenHex(name, fallback) {
    if (typeof document === 'undefined') return fallback
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return toMermaidHex(value || fallback, fallback)
}

export function isDocumentDark() {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
}

/** Build a Mermaid config that tracks the current Krikkit palette (hex only). */
export function buildKrikkitMermaidConfig() {
    const dark = isDocumentDark()
    const fb = dark ? FALLBACK.dark : FALLBACK.light

    const fg = readTokenHex('--color-krikkit-fg', fb.fg)
    const fgSoft = readTokenHex('--color-krikkit-fg-soft', fb.fgSoft)
    const muted = readTokenHex('--color-krikkit-muted', fb.muted)
    const subtle = readTokenHex('--color-krikkit-subtle', fb.subtle)
    const canvas = readTokenHex('--color-krikkit-canvas', fb.canvas)
    const surface = readTokenHex('--color-krikkit-surface', fb.surface)
    const soft = readTokenHex('--color-krikkit-soft', fb.soft)
    const line = readTokenHex('--color-krikkit-line', fb.line)
    const accent = readTokenHex('--color-accent', fb.accent)
    const onAccent = readTokenHex('--color-accent-foreground', fb.onAccent)

    return {
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: 'base',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        themeVariables: {
            darkMode: dark,
            background: surface,
            primaryColor: soft,
            primaryTextColor: fg,
            primaryBorderColor: line,
            secondaryColor: canvas,
            secondaryTextColor: fgSoft,
            secondaryBorderColor: line,
            tertiaryColor: surface,
            tertiaryTextColor: muted,
            tertiaryBorderColor: line,
            mainBkg: soft,
            nodeBorder: line,
            clusterBkg: canvas,
            clusterBorder: line,
            titleColor: fg,
            edgeLabelBackground: surface,
            lineColor: muted,
            textColor: fg,
            actorBkg: soft,
            actorBorder: line,
            actorTextColor: fg,
            actorLineColor: line,
            signalColor: fgSoft,
            signalTextColor: fg,
            labelBoxBkgColor: surface,
            labelBoxBorderColor: line,
            labelTextColor: fg,
            loopTextColor: muted,
            noteBkgColor: soft,
            noteTextColor: fg,
            noteBorderColor: line,
            activationBkgColor: soft,
            activationBorderColor: accent,
            sequenceNumberColor: onAccent,
            sectionBkgColor: soft,
            altSectionBkgColor: canvas,
            gridColor: line,
            cScale0: soft,
            cScale1: canvas,
            cScale2: surface,
            pie1: accent,
            pie2: muted,
            pie3: fgSoft,
            pie4: subtle,
            pieTitleTextColor: fg,
            pieSectionTextColor: fg,
            stateBkg: soft,
            stateLabelColor: fg,
            labelColor: fg,
            altBackground: canvas,
            fontSize: '13px',
        },
        flowchart: {
            curve: 'basis',
            padding: 16,
            nodeSpacing: 40,
            rankSpacing: 44,
            htmlLabels: true,
            useMaxWidth: true,
        },
        sequence: {
            actorMargin: 40,
            boxMargin: 8,
            messageMargin: 36,
            mirrorActors: false,
            useMaxWidth: true,
        },
        state: {
            useMaxWidth: true,
        },
    }
}
