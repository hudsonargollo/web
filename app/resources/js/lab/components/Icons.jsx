/** Lab flask — workspace mark (header, assistant, empty state). */
export function LabIcon({ className = 'h-4 w-4' }) {
    return (
        <svg
            className={['block shrink-0', className].filter(Boolean).join(' ')}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 5v4M8 2h2a2 2 0 0 1 2 2v1h-2a2 2 0 0 1-2-2zm8.815 20h-9.63a1.185 1.185 0 0 1-1.029-1.773L10 13.5V9h4v4.5l3.844 6.727A1.185 1.185 0 0 1 16.814 22M9 9h6m1-6h-2a2 2 0 0 0-2 2v1h2a2 2 0 0 0 2-2z"
            />
        </svg>
    )
}

/**
 * Flask in a 20px box so the mark (and optional disc) shares the first-line
 * box with adjacent 13–14px text.
 */
export function LabGlyph({ className = '', disc = false }) {
    return (
        <span
            className={[
                'inline-flex size-5 shrink-0 items-center justify-center leading-none',
                disc ? 'rounded-full bg-accent/15 text-accent-content' : '',
                className,
            ].filter(Boolean).join(' ')}
            aria-hidden
        >
            <LabIcon className="size-3.5 -translate-y-px" />
        </span>
    )
}

export function IconSend({ className = 'h-4 w-4' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {/* Symmetric up-arrow — optically centered in round send buttons. */}
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
        </svg>
    )
}

export function IconAttach({ className = 'h-4 w-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M16.5 7.5v7.25a4.25 4.25 0 1 1-8.5 0V7a2.75 2.75 0 0 1 5.5 0v7.25a1.25 1.25 0 1 1-2.5 0V8.25"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function IconClose({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    )
}

export function IconFile({ className = 'h-4 w-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M7.75 3.75h5.69c.4 0 .78.16 1.06.44l4.06 4.06c.28.28.44.66.44 1.06v10.94a1.5 1.5 0 0 1-1.5 1.5H7.75a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path
                d="M13 3.75v4.5a1 1 0 0 0 1 1h4.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function IconSwap({ className = 'h-4 w-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M7 8h11M15 5l3 3-3 3M17 16H6M9 13l-3 3 3 3"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

/** DOM inspect / pick-element — filled glyph (composer toolbar). */
export function IconInspect({ className = 'h-5 w-5' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path d="M11.0273 13.2705C10.5195 11.874 11.874 10.5195 13.2705 11.0273L19.7939 13.3994C21.3041 13.9486 21.3377 16.0722 19.8457 16.6689L17.6768 17.5371C17.6132 17.5625 17.5625 17.6132 17.5371 17.6768L16.6689 19.8457C16.0722 21.3377 13.9486 21.3041 13.3994 19.7939L11.0273 13.2705ZM3.25 17V16C3.25 15.5858 3.58579 15.25 4 15.25C4.41421 15.25 4.75 15.5858 4.75 16V17C4.75 18.2426 5.75736 19.25 7 19.25H8C8.41421 19.25 8.75 19.5858 8.75 20C8.75 20.4142 8.41421 20.75 8 20.75H7C4.92893 20.75 3.25 19.0711 3.25 17ZM12.7578 12.4375C12.5583 12.365 12.365 12.5583 12.4375 12.7578L14.8096 19.2812C14.888 19.4969 15.191 19.5021 15.2764 19.2891L16.1445 17.1191C16.3224 16.6746 16.6746 16.3224 17.1191 16.1445L19.2891 15.2764C19.5021 15.191 19.4969 14.888 19.2812 14.8096L12.7578 12.4375ZM3.25 8V7C3.25 4.92893 4.92893 3.25 7 3.25H8C8.41421 3.25 8.75 3.58579 8.75 4C8.75 4.41421 8.41421 4.75 8 4.75H7C5.75736 4.75 4.75 5.75736 4.75 7V8C4.75 8.41421 4.41421 8.75 4 8.75C3.58579 8.75 3.25 8.41421 3.25 8ZM19.25 8V7C19.25 5.75736 18.2426 4.75 17 4.75H16C15.5858 4.75 15.25 4.41421 15.25 4C15.25 3.58579 15.5858 3.25 16 3.25H17C19.0711 3.25 20.75 4.92893 20.75 7V8C20.75 8.41421 20.4142 8.75 20 8.75C19.5858 8.75 19.25 8.41421 19.25 8Z" />
        </svg>
    )
}
