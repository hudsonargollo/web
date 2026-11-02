import { useEffect, useId, useMemo, useRef, useState } from 'react'

function IconChevronDown({ className = 'size-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

/**
 * Lab select — matches Krikkit kit select (rounded-full surface trigger + surface panel).
 *
 * @param {{
 *   id?: string,
 *   value?: string,
 *   onChange?: (value: string) => void,
 *   options?: Array<string | { value: string, label?: string }>,
 *   placeholder?: string,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export function LabSelect({
    id,
    value = '',
    onChange,
    options = [],
    placeholder = 'Select…',
    disabled = false,
    className = '',
}) {
    const listId = useId()
    const rootRef = useRef(null)
    const [open, setOpen] = useState(false)
    const [placement, setPlacement] = useState('bottom')

    const items = useMemo(
        () => options.map((opt) => (
            typeof opt === 'string'
                ? { value: opt, label: opt }
                : { value: String(opt.value), label: opt.label ?? String(opt.value) }
        )),
        [options],
    )

    const selected = items.find((item) => item.value === value) || null

    useEffect(() => {
        if (! open) return undefined
        const onPointerDown = (event) => {
            if (rootRef.current && ! rootRef.current.contains(event.target)) {
                setOpen(false)
            }
        }
        const onKey = (event) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    const toggle = () => {
        if (disabled) return
        if (open) {
            setOpen(false)
            return
        }
        const rect = rootRef.current?.getBoundingClientRect()
        if (rect) {
            const spaceBelow = window.innerHeight - rect.bottom
            const spaceAbove = rect.top
            setPlacement(spaceBelow < 280 && spaceAbove > spaceBelow ? 'top' : 'bottom')
        }
        setOpen(true)
    }

    return (
        <div ref={rootRef} className={`relative w-full ${className}`.trim()}>
            <button
                id={id}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={toggle}
                className={[
                    'flex h-10 w-full items-center justify-between gap-2 rounded-full border border-transparent',
                    'bg-krikkit-surface px-4 text-left text-sm leading-5 text-krikkit-fg outline-none transition',
                    'focus-visible:border-krikkit-muted/40',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                ].join(' ')}
            >
                <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-krikkit-subtle'}`}>
                    {selected?.label || placeholder}
                </span>
                <span className={`shrink-0 text-krikkit-subtle transition ${open ? 'rotate-180' : ''}`}>
                    <IconChevronDown className="size-4" />
                </span>
            </button>

            {open ? (
                <div
                    id={listId}
                    role="listbox"
                    className={[
                        'absolute z-50 flex w-full flex-col overflow-hidden rounded-lg bg-krikkit-surface',
                        placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
                    ].join(' ')}
                >
                    <div className="krikkit-scroll-hover flex max-h-52 flex-col gap-0.5 overflow-auto p-1.5">
                        {items.map((item) => {
                            const active = item.value === value
                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onClick={() => {
                                        onChange?.(item.value)
                                        setOpen(false)
                                    }}
                                    className={[
                                        'flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm transition',
                                        active
                                            ? 'bg-krikkit-soft font-medium text-krikkit-fg'
                                            : 'text-krikkit-fg-soft hover:bg-krikkit-soft',
                                    ].join(' ')}
                                >
                                    {item.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
