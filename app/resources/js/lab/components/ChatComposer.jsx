import { useEffect, useRef } from 'react'
import { createAttachmentFromFile } from '../lib/attachments'
import { COMPOSER_ACCEPT, MAX_ATTACHMENTS, MAX_FILE_BYTES } from '../lib/composerFiles'
import { LAB_BTN_PRIMARY } from '../lib/labConstants'
import { AttachmentGallery } from './AttachmentChip'
import { ComposerPlusMenu } from './ComposerPlusMenu'
import { IconInspect, IconSend } from './Icons'
import { previewEditsNeedUserText } from '../lib/previewEditTargets'
import { ComposerEditPills } from './ComposerEditPills'
import { LabTooltip } from './LabTooltip'

const WORKSPACE_MAX_H = 140
const DOCKED_MAX_H = 120

export function ChatComposer({
    value,
    onChange,
    onSend,
    onStop = null,
    stopping = false,
    attachments = [],
    onAddAttachments,
    onRemoveAttachment,
    disabled = false,
    placeholder = 'Message Lab…',
    large = false,
    /** Workspace rail: stacked layout, minimal height, grows while typing. */
    stacked = false,
    /** Extra toolbar (manual workspace override, turn status, etc.). */
    toolbar = null,
    onImportGithub = null,
    inspecting = false,
    onToggleInspect = null,
    inspectAvailable = false,
    editTargets = [],
    onRemoveEditTarget = null,
}) {
    const textareaRef = useRef(null)
    const fileInputRef = useRef(null)
    /** Blocks key-repeat Ctrl/Cmd+V from flooding attachments. */
    const pasteLockUntilRef = useRef(0)
    const needsCopy = previewEditsNeedUserText(editTargets)
    const canSend = ! disabled && (
        value.trim().length > 0
        || (! needsCopy && (attachments.length > 0 || editTargets.length > 0))
    )
    const canStop = Boolean(onStop) && stopping
    const docked = ! large && ! stacked

    useEffect(() => {
        const el = textareaRef.current
        if (! el) return

        // Landing `large` keeps a fixed min footprint; only docked/workspace auto-grow.
        if (large && ! stacked) {
            el.style.height = ''
            return
        }

        const max = stacked ? WORKSPACE_MAX_H : DOCKED_MAX_H
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, max)}px`
    }, [value, large, stacked])

    useEffect(() => {
        const onFocus = () => {
            const el = textareaRef.current
            if (! el) return
            el.focus()
            const max = stacked ? WORKSPACE_MAX_H : DOCKED_MAX_H
            if (! large || stacked) {
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, max)}px`
            }
        }
        window.addEventListener('krikkit-lab-focus-composer', onFocus)
        return () => window.removeEventListener('krikkit-lab-focus-composer', onFocus)
    }, [large, stacked])

    const submit = () => {
        if (! canSend) {
            return
        }

        onSend({
            content: value,
            attachments,
            editTargets,
        })
    }

    const onKeyDown = (event) => {
        if (event.key === 'Enter' && ! event.shiftKey) {
            event.preventDefault()
            submit()
        }
    }

    const fileKey = (file) => `${file.name || 'paste'}:${file.size}:${file.type}`

    const ingestFiles = (fileList, { fromPaste = false } = {}) => {
        if (disabled || ! onAddAttachments) {
            return false
        }

        if (fromPaste && Date.now() < pasteLockUntilRef.current) {
            return true
        }

        const files = Array.from(fileList || []).filter(Boolean)
        if (files.length === 0) {
            return false
        }

        const remaining = MAX_ATTACHMENTS - attachments.length
        if (remaining <= 0) {
            return fromPaste
        }

        const existing = new Set(
            attachments.map((item) => `${item.name || 'paste'}:${item.size || 0}:${item.type || ''}`),
        )
        const batch = new Set()

        const next = files
            .filter((file) => file.size <= MAX_FILE_BYTES)
            .filter((file) => {
                const key = fileKey(file)
                if (existing.has(key) || batch.has(key)) return false
                batch.add(key)
                return true
            })
            .slice(0, remaining)
            .map(createAttachmentFromFile)

        if (next.length === 0) {
            // Same clipboard file while key-repeating — swallow paste, don't insert as text.
            return fromPaste
        }

        onAddAttachments(next)
        if (fromPaste) {
            pasteLockUntilRef.current = Date.now() + 900
        }
        return true
    }

    const openFilePicker = () => {
        if (disabled || attachments.length >= MAX_ATTACHMENTS) {
            return
        }

        fileInputRef.current?.click()
    }

    const onFilesSelected = (event) => {
        ingestFiles(event.target.files)
        event.target.value = ''
    }

    const onPaste = (event) => {
        if (disabled) {
            return
        }

        const clipboard = event.clipboardData
        if (! clipboard) {
            return
        }

        const fromFiles = Array.from(clipboard.files || [])
        const fromItems = Array.from(clipboard.items || [])
            .filter((item) => item.kind === 'file')
            .map((item) => item.getAsFile())
            .filter(Boolean)

        const seen = new Set()
        const files = [...fromFiles, ...fromItems].filter((file) => {
            const key = fileKey(file)
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        if (files.length === 0) {
            return
        }

        // Keep plain-text paste when clipboard has no usable files.
        if (ingestFiles(files, { fromPaste: true })) {
            event.preventDefault()
        }
    }

    const plusMenu = (
        <ComposerPlusMenu
            disabled={disabled}
            uploadDisabled={attachments.length >= MAX_ATTACHMENTS}
            onUploadComputer={openFilePicker}
            onImportGithub={onImportGithub}
        />
    )

    const inspectBtn = inspectAvailable && onToggleInspect ? (
        <LabTooltip content={inspecting ? 'Stop inspecting' : 'Inspect element'}>
            <button
                type="button"
                onClick={onToggleInspect}
                aria-pressed={inspecting}
                aria-label={inspecting ? 'Stop inspecting' : 'Inspect element'}
                className={[
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 transition',
                    inspecting
                        ? 'bg-accent text-accent-foreground'
                        : 'text-krikkit-muted hover:bg-krikkit-soft hover:text-krikkit-fg',
                ].join(' ')}
            >
                <IconInspect className="block size-5" />
            </button>
        </LabTooltip>
    ) : null

    const leftTools = (
        <div className="flex items-center gap-0.5">
            {plusMenu}
            {inspectBtn}
        </div>
    )

    const sendBtn = canStop ? (
        <LabTooltip content="Stop">
            <button
                type="button"
                onClick={() => onStop?.()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-krikkit-soft p-0 text-krikkit-fg transition hover:bg-krikkit-surface"
                aria-label="Stop generation"
            >
                <span className="block h-3 w-3 rounded-[2px] bg-krikkit-fg" aria-hidden />
            </button>
        </LabTooltip>
    ) : (
        <LabTooltip content={stacked || large ? 'Send · Enter' : 'Send'}>
            <button
                type="button"
                onClick={submit}
                disabled={! canSend}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 ${LAB_BTN_PRIMARY}`}
                aria-label="Send message"
            >
                <IconSend className="block h-4 w-4" />
            </button>
        </LabTooltip>
    )

    return (
        <div
            data-lab-composer
            className={[
                'transition',
                docked
                    ? 'rounded-2xl bg-krikkit-surface/90 px-2 py-2'
                    : stacked
                        ? 'rounded-2xl bg-krikkit-surface p-2.5'
                        : 'rounded-2xl bg-krikkit-surface p-3.5 sm:p-4',
            ].join(' ')}
        >
            {toolbar ? (
                <div className={docked ? 'mb-2 px-1' : 'mb-2'}>
                    {toolbar}
                </div>
            ) : null}

            {editTargets.length > 0 ? (
                <div className={docked ? 'px-1' : ''}>
                    <ComposerEditPills
                        targets={editTargets}
                        onRemove={onRemoveEditTarget}
                        disabled={disabled}
                    />
                </div>
            ) : null}

            {attachments.length > 0 && (
                <div className={docked ? 'mb-2 px-1' : 'mb-2'}>
                    <AttachmentGallery
                        attachments={attachments}
                        onRemove={onRemoveAttachment}
                        disabled={disabled}
                        size={docked ? 'sm' : 'md'}
                    />
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept={COMPOSER_ACCEPT}
                multiple
                className="hidden"
                onChange={onFilesSelected}
            />

            {docked ? (
                <div className="flex items-end gap-1">
                    <div className="mb-0.5">{leftTools}</div>

                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={onKeyDown}
                        onPaste={onPaste}
                        disabled={disabled}
                        placeholder={placeholder}
                        className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                    />

                    <div className="mb-0.5">{sendBtn}</div>
                </div>
            ) : stacked ? (
                <>
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={onKeyDown}
                        onPaste={onPaste}
                        disabled={disabled}
                        placeholder={placeholder}
                        className="krikkit-scroll-hover max-h-[140px] min-h-[36px] w-full resize-none overflow-y-auto bg-transparent py-1 text-sm leading-relaxed text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                    />

                    <div className="mt-1.5 flex items-center justify-between gap-3">
                        {leftTools}
                        {sendBtn}
                    </div>
                </>
            ) : (
                <>
                    <textarea
                        ref={textareaRef}
                        rows={3}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={onKeyDown}
                        onPaste={onPaste}
                        disabled={disabled}
                        placeholder={placeholder}
                        className="min-h-[72px] w-full resize-none bg-transparent text-sm leading-relaxed text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                    />

                    <div className="mt-2 flex items-center justify-between gap-3">
                        {leftTools}
                        {sendBtn}
                    </div>
                </>
            )}
        </div>
    )
}
