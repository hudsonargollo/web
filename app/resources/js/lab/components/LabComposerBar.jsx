import { composerPlaceholderForEdits } from '../lib/previewEditTargets'
import { ChatComposer } from './ChatComposer'
import { FixErrorCard } from './FixErrorCard'
import { SeedChips } from './EmptyLabHero'

/**
 * Composer pane + status toolbar + seed chips.
 */
export function LabComposerBar({
    live,
    building,
    busy,
    draft,
    onDraftChange,
    onSend,
    onStop,
    files,
    onAddFiles,
    onRemoveFile,
    turnStatusLabel,
    fixErrorTarget = null,
    onFixError = null,
    onDismissFixError = null,
    onImportGithub = null,
    inspecting = false,
    onToggleInspect = null,
    inspectAvailable = false,
    editTargets = [],
    onRemoveEditTarget = null,
}) {
    const landing = ! live && ! building

    return (
        <>
            {/*
              Error card sits in an absolute layer above the composer so expand/collapse
              never changes ChatStream height (shelf ResizeObserver / scroll stay untouched).
            */}
            <div
                className={[
                    'lab-layout-pane relative mx-auto w-full min-w-0 max-w-2xl shrink-0 px-4 sm:px-6',
                    live || building ? 'pb-4 pt-4' : 'py-0',
                ].join(' ')}
            >
                {fixErrorTarget ? (
                    <div className="pointer-events-none absolute inset-x-4 bottom-full z-30 sm:inset-x-6">
                        <div className="pointer-events-auto mb-2">
                            <FixErrorCard
                                target={fixErrorTarget}
                                onFix={onFixError}
                                onDismiss={onDismissFixError}
                                disabled={busy}
                            />
                        </div>
                    </div>
                ) : null}

                <ChatComposer
                    value={draft}
                    onChange={onDraftChange}
                    onSend={onSend}
                    onStop={onStop}
                    stopping={busy}
                    attachments={files}
                    onAddAttachments={onAddFiles}
                    onRemoveAttachment={onRemoveFile}
                    disabled={busy}
                    large={landing}
                    stacked={building}
                    placeholder={
                        composerPlaceholderForEdits(editTargets)
                        || (live || building ? 'Reply…' : 'e.g. SaaS landing page for a developer analytics tool…')
                    }
                    onImportGithub={onImportGithub}
                    inspecting={inspecting}
                    onToggleInspect={onToggleInspect}
                    inspectAvailable={inspectAvailable}
                    editTargets={editTargets}
                    onRemoveEditTarget={onRemoveEditTarget}
                />
            </div>

            <SeedChips live={! landing} onPickSeed={onDraftChange} />
        </>
    )
}
