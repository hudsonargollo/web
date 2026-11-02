import { useEffect, useMemo, useRef, useState } from 'react'
import {
    AlignCenter,
    AlignHorizontalJustifyCenter,
    AlignHorizontalJustifyEnd,
    AlignHorizontalJustifyStart,
    AlignLeft,
    AlignRight,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignVerticalJustifyStart,
    Columns2,
    Droplet,
    Minus,
    MoveHorizontal,
    MoveVertical,
    Radius,
    RectangleHorizontal,
    RectangleVertical,
    Rows2,
    Square,
    Type,
    X,
} from 'lucide-react'

const FIELD = 'flex min-w-0 flex-1 items-center gap-1 rounded-md bg-krikkit-fg/[0.06] px-1.5 py-[5px] hover:bg-krikkit-fg/[0.09] focus-within:bg-krikkit-fg/[0.09]'

function Section({ title, children }) {
    return (
        <section className="border-b border-krikkit-fg/[0.08]">
            <p className="px-3 pt-2.5 text-[11px] font-medium text-krikkit-fg">{title}</p>
            <div className="flex flex-col gap-1.5 px-3 py-2.5">{children}</div>
        </section>
    )
}

function Row({ children }) {
    return <div className="flex min-w-0 items-center gap-1">{children}</div>
}

function parseNumeric(value) {
    const match = String(value ?? '').trim().match(/^(-?\d*\.?\d+)/)
    return match ? Number(match[1]) : 0
}

function clampRadius(value, element) {
    const n = parseNumeric(value)
    const w = Number(element?.styles?.w ?? element?.rect?.width ?? 0)
    const h = Number(element?.styles?.h ?? element?.rect?.height ?? 0)
    const cap = Math.min(w, h) / 2
    if (! Number.isFinite(n) || n < 0) return '0'
    if (Number.isFinite(cap) && cap >= 0 && n > cap) return String(Math.round(cap * 100) / 100)
    return String(Math.round(n * 100) / 100)
}

let colorProbe = null

function cssColorToHex(input) {
    const raw = String(input || '').trim()
    if (! raw || raw === 'transparent' || raw === 'none') return 'transparent'
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase()
    if (/^#[0-9a-f]{8}$/i.test(raw)) {
        return raw.slice(7).toLowerCase() === '00' ? 'transparent' : raw.slice(0, 7).toLowerCase()
    }
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
        const s = raw.slice(1)
        return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toLowerCase()
    }
    const comma = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
    if (comma) {
        const to = (n) => Number(n).toString(16).padStart(2, '0')
        return `#${to(comma[1])}${to(comma[2])}${to(comma[3])}`
    }
    const space = raw.match(/rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)/i)
    if (space) {
        const to = (n) => Number(n).toString(16).padStart(2, '0')
        return `#${to(space[1])}${to(space[2])}${to(space[3])}`
    }
    try {
        if (! colorProbe) {
            const canvas = document.createElement('canvas')
            canvas.width = 1
            canvas.height = 1
            colorProbe = canvas.getContext('2d', { willReadFrequently: true })
        }
        if (! colorProbe) return raw
        colorProbe.clearRect(0, 0, 1, 1)
        colorProbe.fillStyle = raw
        colorProbe.fillRect(0, 0, 1, 1)
        const d = colorProbe.getImageData(0, 0, 1, 1).data
        if (! d[3]) return 'transparent'
        const to = (n) => n.toString(16).padStart(2, '0')
        return `#${to(d[0])}${to(d[1])}${to(d[2])}`
    } catch {
        return raw
    }
}

function suffixOf(value) {
    return String(value ?? '').trim().replace(/^-?\d*\.?\d*/, '')
}

function formatNumeric(n, raw) {
    const suffix = suffixOf(raw)
    const rounded = Math.round(n * 100) / 100
    return `${rounded}${suffix}`
}

function clamp(n, min, max) {
    let next = n
    if (min != null && next < min) next = min
    if (max != null && next > max) next = max
    return next
}

/**
 * Figma-style numeric field: drag the leading icon to scrub the value.
 */
function ScrubField({
    icon: Icon,
    label,
    value,
    onChange,
    onCommit,
    suffix = '',
    step = 1,
    min = null,
    max = null,
    title = '',
}) {
    const startRef = useRef({ x: 0, value: 0, raw: '' })
    const dragging = useRef(false)

    const onPointerDown = (event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        dragging.current = true
        startRef.current = {
            x: event.clientX,
            value: parseNumeric(value),
            raw: value ?? '',
        }
        document.body.style.cursor = 'ew-resize'
    }

    const onPointerMove = (event) => {
        if (! dragging.current) return
        const dx = event.clientX - startRef.current.x
        const scale = event.shiftKey ? 0.1 : (event.altKey ? 10 : 1)
        const next = clamp(startRef.current.value + dx * step * scale, min, max)
        onChange?.(formatNumeric(next, startRef.current.raw))
    }

    const endDrag = (event) => {
        if (! dragging.current) return
        dragging.current = false
        try {
            event.currentTarget.releasePointerCapture(event.pointerId)
        } catch {
            /* already released */
        }
        document.body.style.cursor = ''
        onCommit?.()
    }

    return (
        <label className={FIELD}>
            <span
                className="inline-flex shrink-0 cursor-ew-resize items-center text-krikkit-muted hover:text-krikkit-fg"
                title={title || `Drag to change ${label || 'value'}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                <Icon className="size-3.5" strokeWidth={1.75} />
            </span>
            {label ? (
                <span className="shrink-0 text-[10px] font-medium text-krikkit-subtle">{label}</span>
            ) : null}
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
                onBlur={() => onCommit?.()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                }}
                className="min-w-0 flex-1 bg-transparent text-[11px] text-krikkit-fg outline-none"
            />
            {suffix ? (
                <span className="shrink-0 text-[10px] text-krikkit-subtle">{suffix}</span>
            ) : null}
        </label>
    )
}

function SelectField({ value, options, onChange }) {
    return (
        <label className={FIELD}>
            <select
                value={value ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
                className="min-w-0 flex-1 appearance-none bg-transparent text-[11px] text-krikkit-fg outline-none"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </label>
    )
}

function IconBtn({ title, active = false, onClick, children }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={active}
            onClick={onClick}
            className={[
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-krikkit-muted',
                active
                    ? 'bg-krikkit-fg/[0.08] text-krikkit-fg'
                    : 'hover:bg-krikkit-fg/[0.06] hover:text-krikkit-fg',
            ].join(' ')}
        >
            {children}
        </button>
    )
}

function ColorRow({ value, onChange }) {
    const hex = useMemo(() => cssColorToHex(value), [value])
    const picker = hex === 'transparent' || ! /^#[0-9a-f]{6}$/i.test(hex) ? '#ffffff' : hex
    const display = hex
    return (
        <label className={`${FIELD} gap-1.5`}>
            <input
                type="color"
                value={picker}
                onChange={(e) => onChange?.(e.target.value)}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm bg-transparent p-0"
            />
            <input
                type="text"
                value={display}
                onChange={(e) => onChange?.(e.target.value)}
                className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-krikkit-fg outline-none"
            />
        </label>
    )
}

function tagLabel(el) {
    if (! el) return 'Element'
    const id = el.id ? `#${el.id}` : ''
    return `${el.tag || 'div'}${id}`.slice(0, 36)
}

function draftFrom(element) {
    const styles = { ...(element?.styles || {}) }
    if (styles.borderRadius != null) {
        styles.borderRadius = clampRadius(styles.borderRadius, element)
    }
    if (styles.backgroundColor) styles.backgroundColor = cssColorToHex(styles.backgroundColor)
    if (styles.color) styles.color = cssColorToHex(styles.color)
    if (styles.borderColor) styles.borderColor = cssColorToHex(styles.borderColor)
    return { ...styles, text: element?.text || '' }
}

/**
 * Live design properties for the inspected preview element.
 */
export function DomInspectPanel({ element = null, onClose = null, onApply = null }) {
    const [draft, setDraft] = useState(() => draftFrom(element))
    const draftRef = useRef(draft)
    draftRef.current = draft
    const uidRef = useRef(element?.uid ?? element?.path ?? '')
    const applyTimer = useRef(0)

    useEffect(() => {
        const uid = element?.uid ?? element?.path ?? ''
        if (uid !== uidRef.current) {
            uidRef.current = uid
            const next = draftFrom(element)
            draftRef.current = next
            setDraft(next)
        }
    }, [element])

    useEffect(() => () => window.clearTimeout(applyTimer.current), [])

    const push = (partial, { immediate = false } = {}) => {
        const next = { ...draftRef.current, ...partial }
        draftRef.current = next
        setDraft(next)
        window.clearTimeout(applyTimer.current)
        const run = () => {
            const styles = {}
            Object.keys(partial).forEach((key) => {
                if (key !== 'text') styles[key] = next[key]
            })
            onApply?.({
                styles: Object.keys(styles).length ? styles : undefined,
                text: Object.prototype.hasOwnProperty.call(partial, 'text') ? next.text : undefined,
            })
        }
        if (immediate) run()
        else applyTimer.current = window.setTimeout(run, 80)
    }

    const setStyle = (key, value, opts) => push({ [key]: value }, opts)
    const commit = () => {
        window.clearTimeout(applyTimer.current)
        const { text, ...styles } = draftRef.current
        onApply?.({ styles, text })
    }

    if (! element) return null

    const display = draft.display || 'block'
    const isFlex = display === 'flex' || display === 'inline-flex'
    const flexCol = isFlex && draft.flexDirection === 'column'
    const icon = 'size-3.5'

    return (
        <aside
            className="flex h-full w-[272px] shrink-0 flex-col border-l border-krikkit-line bg-krikkit-canvas"
            aria-label="Inspect"
        >
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-krikkit-line bg-krikkit-canvas px-3">
                <p className="min-w-0 flex-1 truncate text-xs font-medium text-krikkit-fg" title={element.path}>
                    {tagLabel(element)}
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-6 w-6 items-center justify-center text-krikkit-muted transition hover:text-krikkit-fg"
                    aria-label="Close inspect"
                    title="Close"
                >
                    <X className="size-3.5" strokeWidth={1.75} />
                </button>
            </div>

            <div className="krikkit-scroll-hover min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <Section title="Position">
                    <Row>
                        <ScrubField icon={MoveHorizontal} label="X" value={draft.x} onChange={(v) => setStyle('x', v)} onCommit={commit} />
                        <ScrubField icon={MoveVertical} label="Y" value={draft.y} onChange={(v) => setStyle('y', v)} onCommit={commit} />
                    </Row>
                </Section>

                <Section title="Layout">
                    <Row>
                        <IconBtn
                            title="Block"
                            active={display === 'block'}
                            onClick={() => setStyle('display', 'block', { immediate: true })}
                        >
                            <Square className={icon} strokeWidth={1.75} />
                        </IconBtn>
                        <IconBtn
                            title="Row"
                            active={isFlex && ! flexCol}
                            onClick={() => push({ display: 'flex', flexDirection: 'row' }, { immediate: true })}
                        >
                            <Columns2 className={icon} strokeWidth={1.75} />
                        </IconBtn>
                        <IconBtn
                            title="Column"
                            active={flexCol}
                            onClick={() => push({ display: 'flex', flexDirection: 'column' }, { immediate: true })}
                        >
                            <Rows2 className={icon} strokeWidth={1.75} />
                        </IconBtn>
                    </Row>
                    <Row>
                        <ScrubField icon={RectangleHorizontal} label="W" value={draft.w} onChange={(v) => setStyle('w', v)} onCommit={commit} min={0} />
                        <ScrubField icon={RectangleVertical} label="H" value={draft.h} onChange={(v) => setStyle('h', v)} onCommit={commit} min={0} />
                    </Row>
                    {isFlex ? (
                        <>
                            <Row>
                                <IconBtn title="Justify start" active={draft.justifyContent === 'flex-start'} onClick={() => setStyle('justifyContent', 'flex-start', { immediate: true })}>
                                    <AlignHorizontalJustifyStart className={icon} strokeWidth={1.75} />
                                </IconBtn>
                                <IconBtn title="Justify center" active={draft.justifyContent === 'center'} onClick={() => setStyle('justifyContent', 'center', { immediate: true })}>
                                    <AlignHorizontalJustifyCenter className={icon} strokeWidth={1.75} />
                                </IconBtn>
                                <IconBtn title="Justify end" active={draft.justifyContent === 'flex-end'} onClick={() => setStyle('justifyContent', 'flex-end', { immediate: true })}>
                                    <AlignHorizontalJustifyEnd className={icon} strokeWidth={1.75} />
                                </IconBtn>
                                <span className="mx-0.5 h-4 w-px bg-krikkit-fg/[0.08]" aria-hidden />
                                <IconBtn title="Align start" active={draft.alignItems === 'flex-start'} onClick={() => setStyle('alignItems', 'flex-start', { immediate: true })}>
                                    <AlignVerticalJustifyStart className={icon} strokeWidth={1.75} />
                                </IconBtn>
                                <IconBtn title="Align center" active={draft.alignItems === 'center'} onClick={() => setStyle('alignItems', 'center', { immediate: true })}>
                                    <AlignVerticalJustifyCenter className={icon} strokeWidth={1.75} />
                                </IconBtn>
                                <IconBtn title="Align end" active={draft.alignItems === 'flex-end'} onClick={() => setStyle('alignItems', 'flex-end', { immediate: true })}>
                                    <AlignVerticalJustifyEnd className={icon} strokeWidth={1.75} />
                                </IconBtn>
                            </Row>
                            <Row>
                                <ScrubField icon={Columns2} label="Gap" value={draft.gap} onChange={(v) => setStyle('gap', v)} onCommit={commit} min={0} />
                            </Row>
                        </>
                    ) : null}
                </Section>

                <Section title="Appearance">
                    <Row>
                        <ScrubField icon={Droplet} value={draft.opacity} suffix="%" onChange={(v) => setStyle('opacity', v)} onCommit={commit} min={0} max={100} title="Opacity" />
                        <ScrubField icon={Radius} value={draft.borderRadius} onChange={(v) => setStyle('borderRadius', v)} onCommit={commit} min={0} title="Radius" />
                    </Row>
                </Section>

                <Section title="Fill">
                    <ColorRow
                        value={draft.backgroundColor}
                        onChange={(v) => setStyle('backgroundColor', v, { immediate: true })}
                    />
                </Section>

                <Section title="Stroke">
                    <Row>
                        <ScrubField icon={Minus} value={draft.borderWidth} onChange={(v) => setStyle('borderWidth', v)} onCommit={commit} min={0} title="Stroke width" />
                        <SelectField
                            value={draft.borderStyle || 'none'}
                            onChange={(v) => setStyle('borderStyle', v, { immediate: true })}
                            options={[
                                { value: 'none', label: 'None' },
                                { value: 'solid', label: 'Solid' },
                                { value: 'dashed', label: 'Dashed' },
                            ]}
                        />
                    </Row>
                    <ColorRow
                        value={draft.borderColor}
                        onChange={(v) => setStyle('borderColor', v, { immediate: true })}
                    />
                </Section>

                <Section title="Type">
                    <Row>
                        <ScrubField icon={Type} value={draft.fontSize} onChange={(v) => setStyle('fontSize', v)} onCommit={commit} min={1} title="Size" />
                        <SelectField
                            value={String(draft.fontWeight || '400')}
                            onChange={(v) => setStyle('fontWeight', v, { immediate: true })}
                            options={[
                                { value: '400', label: 'Regular' },
                                { value: '500', label: 'Medium' },
                                { value: '600', label: 'Semibold' },
                                { value: '700', label: 'Bold' },
                            ]}
                        />
                    </Row>
                    <Row>
                        <IconBtn title="Left" active={draft.textAlign === 'left' || draft.textAlign === 'start'} onClick={() => setStyle('textAlign', 'left', { immediate: true })}>
                            <AlignLeft className={icon} strokeWidth={1.75} />
                        </IconBtn>
                        <IconBtn title="Center" active={draft.textAlign === 'center'} onClick={() => setStyle('textAlign', 'center', { immediate: true })}>
                            <AlignCenter className={icon} strokeWidth={1.75} />
                        </IconBtn>
                        <IconBtn title="Right" active={draft.textAlign === 'right' || draft.textAlign === 'end'} onClick={() => setStyle('textAlign', 'right', { immediate: true })}>
                            <AlignRight className={icon} strokeWidth={1.75} />
                        </IconBtn>
                    </Row>
                    <ColorRow
                        value={draft.color}
                        onChange={(v) => setStyle('color', v, { immediate: true })}
                    />
                </Section>

                <Section title="Spacing">
                    <p className="text-[10px] text-krikkit-subtle">Padding</p>
                    <Row>
                        <ScrubField icon={MoveVertical} label="T" value={draft.paddingT} onChange={(v) => setStyle('paddingT', v)} onCommit={commit} min={0} />
                        <ScrubField icon={MoveHorizontal} label="R" value={draft.paddingR} onChange={(v) => setStyle('paddingR', v)} onCommit={commit} min={0} />
                    </Row>
                    <Row>
                        <ScrubField icon={MoveVertical} label="B" value={draft.paddingB} onChange={(v) => setStyle('paddingB', v)} onCommit={commit} min={0} />
                        <ScrubField icon={MoveHorizontal} label="L" value={draft.paddingL} onChange={(v) => setStyle('paddingL', v)} onCommit={commit} min={0} />
                    </Row>
                    <p className="mt-1 text-[10px] text-krikkit-subtle">Margin</p>
                    <Row>
                        <ScrubField icon={MoveVertical} label="T" value={draft.marginT} onChange={(v) => setStyle('marginT', v)} onCommit={commit} />
                        <ScrubField icon={MoveHorizontal} label="R" value={draft.marginR} onChange={(v) => setStyle('marginR', v)} onCommit={commit} />
                    </Row>
                    <Row>
                        <ScrubField icon={MoveVertical} label="B" value={draft.marginB} onChange={(v) => setStyle('marginB', v)} onCommit={commit} />
                        <ScrubField icon={MoveHorizontal} label="L" value={draft.marginL} onChange={(v) => setStyle('marginL', v)} onCommit={commit} />
                    </Row>
                </Section>
            </div>
        </aside>
    )
}
