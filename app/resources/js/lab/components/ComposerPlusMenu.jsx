import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function IconPlus({ className = 'size-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    )
}

function IconChevronRight({ className = 'size-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function IconChevronLeft({ className = 'size-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function IconGithub({ className = 'size-3.5' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 640 640"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            aria-hidden="true"
        >
            <path d="M319.988 7.973C143.293 7.973 0 151.242 0 327.96c0 141.392 91.678 261.298 218.826 303.63 16.004 2.964 21.886-6.957 21.886-15.414 0-7.63-.319-32.835-.449-59.552-89.032 19.359-107.8-37.772-107.8-37.772-14.552-36.993-35.529-46.831-35.529-46.831-29.032-19.879 2.209-19.442 2.209-19.442 32.126 2.245 49.04 32.954 49.04 32.954 28.56 48.922 74.883 34.76 93.131 26.598 2.882-20.681 11.15-34.807 20.315-42.803-71.08-8.067-145.797-35.516-145.797-158.14 0-34.926 12.52-63.485 32.965-85.88-3.33-8.078-14.291-40.606 3.083-84.674 0 0 26.87-8.61 88.029 32.8 25.512-7.075 52.878-10.642 80.056-10.76 27.2.118 54.614 3.673 80.162 10.76 61.076-41.386 87.922-32.8 87.922-32.8 17.398 44.08 6.485 76.631 3.154 84.675 20.516 22.394 32.93 50.953 32.93 85.879 0 122.907-74.883 149.93-146.117 157.856 11.481 9.921 21.733 29.398 21.733 59.233 0 42.792-.366 77.28-.366 87.804 0 8.516 5.764 18.473 21.992 15.354 127.076-42.354 218.637-162.274 218.637-303.582 0-176.695-143.269-319.988-320-319.988l-.023.107z" />
        </svg>
    )
}

function IconUpload({ className = 'size-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 16V5M8 8l4-4 4 4M5 19h14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

/** Between page canvas and composer surface — elevated, not the same as the composer. */
const menuPanelClass =
    'rounded-xl border border-krikkit-line bg-[color-mix(in_oklab,var(--color-krikkit-canvas)_55%,var(--color-krikkit-surface)_45%)] p-1'

const itemClass = [
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs',
    'text-krikkit-fg-soft transition hover:bg-krikkit-soft hover:text-krikkit-fg',
    'disabled:pointer-events-none disabled:opacity-40',
].join(' ')

/**
 * Composer “+” menu: Import from GitHub, upload from computer.
 */
export function ComposerPlusMenu({
    disabled = false,
    uploadDisabled = false,
    onUploadComputer,
    onImportGithub = null,
}) {
    const rootRef = useRef(null)
    const menuRef = useRef(null)
    const menuId = useId()
    const [open, setOpen] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    const [menuStyle, setMenuStyle] = useState(null)
    const [placement, setPlacement] = useState('bottom')
    const [subSide, setSubSide] = useState('right')

    const githubImport = typeof onImportGithub === 'function'

    const closeAll = () => {
        setOpen(false)
        setImportOpen(false)
        queueMicrotask(() => {
            const active = document.activeElement
            if (active instanceof HTMLElement && rootRef.current?.contains(active)) {
                active.blur()
            }
        })
    }

    const positionMenu = () => {
        const el = rootRef.current
        if (! el) return
        const rect = el.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        const menuNeed = 220
        const nextPlacement = spaceBelow >= menuNeed || spaceBelow >= spaceAbove
            ? 'bottom'
            : 'top'
        setPlacement(nextPlacement)

        const gap = 6
        const menuWidth = 216
        const subWidth = 176
        const spaceRight = window.innerWidth - rect.left - menuWidth
        setSubSide(spaceRight >= subWidth + 12 ? 'right' : 'left')

        if (nextPlacement === 'bottom') {
            setMenuStyle({
                position: 'fixed',
                top: rect.bottom + gap,
                left: rect.left,
                zIndex: 120,
            })
        } else {
            setMenuStyle({
                position: 'fixed',
                bottom: window.innerHeight - rect.top + gap,
                left: rect.left,
                zIndex: 120,
            })
        }
    }

    useLayoutEffect(() => {
        if (! open) {
            setMenuStyle(null)
            return undefined
        }
        positionMenu()
        const onReposition = () => positionMenu()
        window.addEventListener('resize', onReposition)
        window.addEventListener('scroll', onReposition, true)
        return () => {
            window.removeEventListener('resize', onReposition)
            window.removeEventListener('scroll', onReposition, true)
        }
    }, [open])

    useEffect(() => {
        if (! open) return undefined

        const onPointer = (event) => {
            const t = event.target
            if (rootRef.current?.contains(t)) return
            if (menuRef.current?.contains(t)) return
            closeAll()
        }
        const onKey = (event) => {
            if (event.key === 'Escape') closeAll()
        }

        document.addEventListener('mousedown', onPointer)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onPointer)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    const menu = open && menuStyle
        ? createPortal(
            <div
                ref={menuRef}
                id={menuId}
                role="menu"
                style={menuStyle}
                className={`min-w-[13.5rem] ${menuPanelClass}`}
            >
                {githubImport ? (
                    <div
                        className="relative"
                        onMouseEnter={() => setImportOpen(true)}
                        onMouseLeave={() => setImportOpen(false)}
                    >
                        <button
                            type="button"
                            role="menuitem"
                            className={`${itemClass} justify-between`}
                            onClick={() => setImportOpen((value) => ! value)}
                            aria-haspopup="menu"
                            aria-expanded={importOpen}
                        >
                            <span>Import from…</span>
                            <span className="ml-auto flex items-center gap-1.5 pl-3">
                                {subSide === 'left' ? (
                                    <IconChevronLeft className="size-3.5 shrink-0 text-krikkit-subtle" />
                                ) : null}
                                <IconGithub className="size-3.5 shrink-0" />
                                {subSide === 'right' ? (
                                    <IconChevronRight className="size-3.5 shrink-0 text-krikkit-subtle" />
                                ) : null}
                            </span>
                        </button>

                        {importOpen ? (
                            <div
                                className={[
                                    'absolute top-0 z-50 flex',
                                    subSide === 'right' ? 'left-full pl-1.5' : 'right-full pr-1.5',
                                ].join(' ')}
                            >
                                <div role="menu" className={`min-w-[11rem] ${menuPanelClass}`}>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className={itemClass}
                                        onClick={() => {
                                            onImportGithub?.()
                                            closeAll()
                                        }}
                                    >
                                        <IconGithub className="size-3.5 shrink-0" />
                                        <span>Import from GitHub</span>
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {githubImport ? (
                    <div className="my-1 border-t border-krikkit-line/60" role="separator" />
                ) : null}

                <button
                    type="button"
                    role="menuitem"
                    disabled={uploadDisabled}
                    className={itemClass}
                    onClick={() => {
                        onUploadComputer?.()
                        closeAll()
                    }}
                >
                    <IconUpload className="size-3.5 shrink-0" />
                    <span>Upload from computer</span>
                </button>
            </div>,
            document.body,
        )
        : null

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    setImportOpen(false)
                    setOpen((value) => {
                        const next = ! value
                        if (next) queueMicrotask(() => positionMenu())
                        return next
                    })
                }}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full p-0 text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg disabled:pointer-events-none disabled:opacity-40"
                aria-label="Add"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
            >
                <IconPlus className="block size-[18px]" />
            </button>

            {menu}
        </div>
    )
}
