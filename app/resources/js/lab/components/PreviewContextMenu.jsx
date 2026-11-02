import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildPreviewContextItems, previewElementSnippet } from '../lib/previewContextItems'

const PIN_ACTIONS = new Set([
    'change-link',
    'change-src',
    'change-alt',
    'change-placeholder',
    'change-value',
    'ask-lab',
])

function MenuRow({ label, onClick }) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-krikkit-fg transition-colors hover:bg-krikkit-soft"
        >
            <span className="min-w-0 truncate">{label}</span>
        </button>
    )
}

/**
 * Right-click menu over the live preview iframe.
 */
export function PreviewContextMenu({
    open = false,
    x = 0,
    y = 0,
    element = null,
    onClose = null,
    onApply = null,
    onInspect = null,
    onPin = null,
    onEditText = null,
}) {
    const rootRef = useRef(null)
    const [copied, setCopied] = useState(false)
    const [pos, setPos] = useState({ left: x, top: y })

    const { items } = useMemo(
        () => (element ? buildPreviewContextItems(element) : { kind: 'box', items: [] }),
        [element],
    )

    useEffect(() => {
        if (! open) setCopied(false)
    }, [open])

    useLayoutEffect(() => {
        if (! open) return
        const node = rootRef.current
        if (! node) {
            setPos({ left: x, top: y })
            return
        }
        const w = node.offsetWidth || 240
        const h = node.offsetHeight || 220
        const pad = 10
        let left = x
        let top = y
        if (left + w > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - w - pad)
        if (top + h > window.innerHeight - pad) top = Math.max(pad, y - h)
        if (top < pad) top = pad
        if (left < pad) left = pad
        setPos({ left, top })
    }, [open, x, y, element])

    useEffect(() => {
        if (! open) return undefined
        const onKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose?.()
            }
        }
        const onPointer = (event) => {
            if (rootRef.current?.contains(event.target)) return
            onClose?.()
        }
        document.addEventListener('keydown', onKey)
        document.addEventListener('mousedown', onPointer)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.removeEventListener('mousedown', onPointer)
        }
    }, [open, onClose])

    if (! open || ! element || typeof document === 'undefined') return null

    const snippet = previewElementSnippet(element)
    const tag = element.tag || 'div'

    const run = (id) => {
        if (id === 'change-text') {
            onEditText?.(element)
            onClose?.()
            return
        }
        if (PIN_ACTIONS.has(id)) {
            onPin?.({ element, action: id })
            onClose?.()
            return
        }
        if (id === 'copy') {
            const clip = String(element.text || '').trim() || element.path || tag
            void navigator.clipboard?.writeText?.(clip).then(() => {
                setCopied(true)
                window.setTimeout(() => onClose?.(), 700)
            }).catch(() => onClose?.())
            return
        }
        if (id === 'inspect') {
            onInspect?.(element)
            onClose?.()
            return
        }
        if (id === 'hide') {
            const applied = { styles: { display: 'none' } }
            onApply?.(applied)
            onPin?.({ element, action: 'hide', applied })
            onClose?.()
            return
        }
        if (id === 'copy-selector') {
            const sel = element.path || tag
            void navigator.clipboard?.writeText?.(sel).then(() => {
                setCopied(true)
                window.setTimeout(() => onClose?.(), 700)
            }).catch(() => onClose?.())
        }
    }

    return createPortal(
        <div
            ref={rootRef}
            className="fixed z-[80] w-[17.5rem] overflow-hidden rounded-xl border border-krikkit-line bg-krikkit-surface"
            style={{ left: pos.left, top: pos.top }}
            role="presentation"
        >
            <div className="border-b border-krikkit-line px-3 py-2">
                <p className="truncate font-mono text-[11px] text-accent-content">{tag}{element.id ? `#${element.id}` : ''}</p>
                <p className="mt-0.5 truncate text-[11px] text-krikkit-muted">{snippet}</p>
            </div>
            <div className="p-1" role="menu">
                {items.map((item) => {
                    if (item.sep) {
                        return <div key={item.id} className="my-1 h-px bg-krikkit-line" role="separator" />
                    }
                    return (
                        <MenuRow
                            key={item.id}
                            label={
                                (item.id === 'copy-selector' || item.id === 'copy') && copied
                                    ? 'Copied'
                                    : item.label
                            }
                            onClick={() => run(item.id)}
                        />
                    )
                })}
            </div>
        </div>,
        document.body,
    )
}
