import { useEffect, useId, useRef, useState } from 'react'

const POS = {
    top: 'bottom-full mb-1.5 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-1.5 left-1/2 -translate-x-1/2',
    left: 'right-full mr-1.5 top-1/2 -translate-y-1/2',
    right: 'left-full ml-1.5 top-1/2 -translate-y-1/2',
}

/** Hold this long before the tip appears (Lab-only — avoids flicker on quick hovers). */
const SHOW_DELAY_MS = 450

/**
 * Lab hover tip with show delay. Pointer-only by default (focus would stick after menu clicks).
 */
export function LabTooltip({
    content,
    position = 'top',
    children,
    className = '',
    delayMs = SHOW_DELAY_MS,
    /** Keyboard focus rarely needs a floating tip here — aria-label covers a11y. */
    showOnFocus = false,
}) {
    const tipId = useId()
    const [open, setOpen] = useState(false)
    const timerRef = useRef(null)
    const label = typeof content === 'string' ? content.trim() : ''

    const clearTimer = () => {
        if (timerRef.current != null) {
            window.clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }

    const scheduleShow = () => {
        if (! label) return
        clearTimer()
        timerRef.current = window.setTimeout(() => {
            timerRef.current = null
            setOpen(true)
        }, delayMs)
    }

    const hide = () => {
        clearTimer()
        setOpen(false)
    }

    useEffect(() => () => clearTimer(), [])

    // Content cleared (e.g. + menu opened) — never leave a stuck tip.
    useEffect(() => {
        if (! label) hide()
    }, [label])

    return (
        <span
            className={['relative inline-flex', className].filter(Boolean).join(' ')}
            onMouseEnter={scheduleShow}
            onMouseLeave={hide}
            onFocus={showOnFocus ? scheduleShow : undefined}
            onBlur={showOnFocus ? hide : undefined}
        >
            {children}
            {open && label ? (
                <span
                    id={tipId}
                    role="tooltip"
                    className={[
                        'pointer-events-none absolute z-50 whitespace-nowrap rounded-md',
                        'bg-krikkit-fill px-2 py-1 text-xs text-krikkit-on-fill',
                        POS[position] || POS.top,
                    ].join(' ')}
                >
                    {label}
                </span>
            ) : null}
        </span>
    )
}
