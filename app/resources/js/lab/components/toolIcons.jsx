export function IconChevron({ open, className = 'h-3.5 w-3.5' }) {
    return (
        <svg
            className={[
                className,
                'transition-transform duration-200',
                open ? 'rotate-90' : 'rotate-0',
            ].join(' ')}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="m9 6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function IconFile({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M7.75 3.75h5.69c.4 0 .78.16 1.06.44l4.06 4.06c.28.28.44.66.44 1.06v10.94a1.5 1.5 0 0 1-1.5 1.5H7.75a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path
                d="M13 3.75v4.5a1 1 0 0 0 1 1h4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function IconBrain({ className = 'h-3.5 w-3.5 shrink-0' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M12 18V5" />
            <path d="M15 13a4.17 4.17 0 0 1 -3 -4 4.17 4.17 0 0 1 -3 4" />
            <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0 -5.598 1.5" />
            <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
            <path d="M18 18a4 4 0 0 0 2 -7.464" />
            <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1 -7.967 -.517" />
            <path d="M6 18a4 4 0 0 1 -2 -7.464" />
            <path d="M6.003 5.125a4 4 0 0 0 -2.526 5.77" />
        </svg>
    )
}

export function IconImage({ className = 'h-3.5 w-3.5 shrink-0' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="1.75" />
            <circle cx="9" cy="9.25" r="1.6" />
            <path d="m20.25 15.5-4.2-4.2a1.5 1.5 0 0 0-2.12 0L6.5 18.75" />
        </svg>
    )
}

export function IconEye({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M2.5 12s3.5-6.25 9.5-6.25S21.5 12 21.5 12s-3.5 6.25-9.5 6.25S2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="2.75" />
        </svg>
    )
}

export function IconDiff({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 8h5M5 16h5M14 8h5M14 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

export function IconTerminal({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3.75" y="5.75" width="16.5" height="12.5" rx="1.75" stroke="currentColor" strokeWidth="1.5" />
            <path d="m7.5 10 2.5 2-2.5 2M12.5 14H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function IconGrep({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

export function IconFolder({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M3.75 7.75A1.5 1.5 0 0 1 5.25 6.25h4.1l1.5 1.5h8.9a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-10Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function IconCylinder({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <ellipse cx="12" cy="6.5" rx="7.25" ry="2.75" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4.75 6.5v11c0 1.52 3.24 2.75 7.25 2.75s7.25-1.23 7.25-2.75v-11" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    )
}

export function IconGlobe({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3.75 12h16.5M12 3.75c2.5 2.8 2.5 13.7 0 16.5M12 3.75c-2.5 2.8-2.5 13.7 0 16.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    )
}

export function IconCheck({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m5 12 5 5L19 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function fileName(path = '') {
    const clean = String(path).replace(/\\/g, '/')
    const base = clean.split('/').filter(Boolean).pop()
    return base || clean || 'untitled'
}

export function fileDir(path = '') {
    const clean = String(path).replace(/\\/g, '/').replace(/^\.\//, '')
    const parts = clean.split('/').filter(Boolean)
    if (parts.length <= 1) return ''
    return `./${parts.slice(0, -1).join('/')}`
}
