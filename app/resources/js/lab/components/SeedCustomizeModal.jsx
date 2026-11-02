import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
    buildCustomSeedPrompt,
    defaultSeedValues,
    LAB_BTN_OUTLINE,
    LAB_BTN_PRIMARY,
} from '../lib/labConstants'
import { LabSelect } from './LabSelect'

const fieldClass = [
    'h-10 w-full rounded-full border border-transparent bg-krikkit-surface',
    'px-4 text-sm font-normal text-krikkit-fg placeholder:text-krikkit-subtle',
    'outline-none transition focus:border-krikkit-muted/40',
].join(' ')

const areaClass = [
    'min-h-[5.5rem] w-full resize-y rounded-2xl border border-transparent bg-krikkit-surface',
    'px-4 py-3 text-sm font-normal text-krikkit-fg placeholder:text-krikkit-subtle',
    'outline-none transition focus:border-krikkit-muted/40',
].join(' ')

/**
 * Pre-build form for customizable Lab seeds (habit tracker, invoice, directory, link in bio).
 */
export function SeedCustomizeModal({ seed = null, open = false, onClose, onApply }) {
    const titleId = useId()
    const firstRef = useRef(null)
    const fields = seed?.customize?.fields ?? []
    const defaults = useMemo(() => defaultSeedValues(seed), [seed])
    const [values, setValues] = useState(defaults)

    useEffect(() => {
        if (! open) return undefined
        setValues(defaultSeedValues(seed))
        const id = window.requestAnimationFrame(() => firstRef.current?.focus())
        return () => window.cancelAnimationFrame(id)
    }, [open, seed])

    useEffect(() => {
        if (! open) return undefined
        const onKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose?.()
            }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [open, onClose])

    if (! open || ! seed) return null

    const setField = (key, value) => {
        setValues((prev) => ({ ...prev, [key]: value }))
    }

    const submit = () => {
        onApply?.(buildCustomSeedPrompt(seed, values))
    }

    return (
        <div className="krikkit-scroll-hover fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto px-4 py-10 sm:py-[12vh]">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Dismiss"
                onClick={onClose}
            />
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative w-full max-w-md rounded-2xl border border-krikkit-line bg-krikkit-canvas p-5"
                onSubmit={(event) => {
                    event.preventDefault()
                    submit()
                }}
            >
                <h2 id={titleId} className="text-base font-semibold text-krikkit-fg">
                    {seed.title}
                </h2>
                {seed.customize?.copy ? (
                    <p className="mt-1 text-sm text-krikkit-muted">{seed.customize.copy}</p>
                ) : null}

                <div className="mt-4 space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.key}>
                            <label
                                htmlFor={`seed-field-${field.key}`}
                                className="mb-1.5 block text-[11px] font-medium text-krikkit-muted"
                            >
                                {field.label}
                            </label>
                            {field.type === 'select' ? (
                                <LabSelect
                                    id={`seed-field-${field.key}`}
                                    value={values[field.key] ?? field.default ?? ''}
                                    onChange={(value) => setField(field.key, value)}
                                    options={field.options ?? []}
                                />
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    ref={index === 0 ? firstRef : undefined}
                                    id={`seed-field-${field.key}`}
                                    value={values[field.key] ?? ''}
                                    onChange={(event) => setField(field.key, event.target.value)}
                                    placeholder={field.placeholder}
                                    className={areaClass}
                                    rows={4}
                                />
                            ) : (
                                <input
                                    ref={index === 0 ? firstRef : undefined}
                                    id={`seed-field-${field.key}`}
                                    type="text"
                                    value={values[field.key] ?? ''}
                                    onChange={(event) => setField(field.key, event.target.value)}
                                    placeholder={field.placeholder}
                                    className={fieldClass}
                                    autoComplete="off"
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`rounded-full px-3.5 py-2 text-sm ${LAB_BTN_OUTLINE}`}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`rounded-full px-3.5 py-2 text-sm font-medium ${LAB_BTN_PRIMARY}`}
                    >
                        Use this
                    </button>
                </div>
            </form>
        </div>
    )
}
