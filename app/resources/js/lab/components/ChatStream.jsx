import { AutoRepairCard } from './AutoRepairCard'
import { ChatMessage } from './ChatMessage'
import { LabTooltip } from './LabTooltip'
import { TurnActivity } from './TurnActivity'

function FollowLatestButton({ visible, onClick }) {
    if (! visible) return null

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
            <LabTooltip content="Follow latest" position="top">
                <button
                    type="button"
                    onClick={onClick}
                    aria-label="Follow latest"
                    className={[
                        'pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full',
                        'bg-krikkit-surface text-krikkit-fg',
                        'transition-colors hover:bg-krikkit-soft',
                    ].join(' ')}
                >
                    <svg className="h-4 w-4 text-krikkit-muted" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            d="M12 5v14M6 13l6 6 6-6"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </LabTooltip>
        </div>
    )
}

/**
 * Scrollable message list, shelf wrappers, and follow-latest control.
 */
export function ChatStream({
    live,
    building,
    busy,
    turns,
    shelfTurnId,
    shelfMinHeight,
    laneRef,
    threadStackRef,
    latestRef,
    bubbleRefs,
    showFollowButton,
    onResumeFollow,
    onOpenPath,
    onOpenConsole,
    onSkipGate,
    onAcceptGate,
    onPickSuggestion,
}) {
    return (
        <div
            className={[
                'relative min-h-0 min-w-0',
                // Grow whenever the rail is in workspace mode — even with an empty thread —
                // so the composer stays docked at the bottom.
                live || building ? 'flex-[1_1_0%]' : 'flex-[0_0_0%]',
            ].join(' ')}
        >
            <div
                ref={laneRef}
                className={[
                    'lab-layout-pane h-full min-h-0 min-w-0',
                    live || building ? 'krikkit-scroll-hover overflow-y-auto' : 'overflow-hidden',
                ].join(' ')}
            >
                {live && (
                    <div
                        ref={threadStackRef}
                        className="lab-thread-stack mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-14 sm:px-6"
                    >
                        {turns.map((turn, i) => {
                            const isLatest = i === turns.length - 1
                            const onShelf = turn.id === shelfTurnId
                            const showGate = isLatest
                                && turn.buildGate === 'pending'
                                && Boolean(turn.bot)
                                && ! busy
                            const hasUserBubble = Boolean(
                                turn.user?.autoRepair
                                || turn.user?.text?.trim()
                                || turn.user?.files?.length
                                || turn.user?.editTargets?.length,
                            )
                            const hasAssistant = Boolean(
                                turn.thinking
                                || turn.todos
                                || turn.listDir
                                || (Array.isArray(turn.listDirs) && turn.listDirs.length)
                                || turn.fileSearch
                                || (Array.isArray(turn.fileSearches) && turn.fileSearches.length)
                                || turn.grep
                                || (Array.isArray(turn.greps) && turn.greps.length)
                                || turn.readFile
                                || (Array.isArray(turn.reads) && turn.reads.length)
                                || turn.editFile
                                || (Array.isArray(turn.edits) && turn.edits.length)
                                || turn.shell
                                || turn.fetch
                                || turn.writeFile
                                || (Array.isArray(turn.writes) && turn.writes.length)
                                || (Array.isArray(turn.toolStack) && turn.toolStack.length)
                                || turn.bot
                                || turn.botFollowUp
                                || turn.skipDivider
                                || turn.buildGate === 'skipped'
                                || showGate
                                || (turn.callouts && turn.callouts.length)
                                || turn.vfsHeal
                                // Keep the section mounted for silent Switch settle + status.
                                || turn.turnStatus
                                || turn.waitStartedAt,
                            )

                            // Silent Switch creates a turn with empty user — never mount
                            // an empty section (shelf minHeight + gap = ghost whitespace).
                            if (! hasUserBubble && ! hasAssistant) {
                                return null
                            }

                            return (
                                <section
                                    key={turn.id}
                                    ref={(node) => {
                                        // Whole turn (user + AI) lifts together.
                                        if (node) bubbleRefs.current[turn.id] = node
                                        else delete bubbleRefs.current[turn.id]
                                        if (isLatest) latestRef.current = node
                                    }}
                                    className="lab-reply-shelf"
                                    style={onShelf && shelfMinHeight > 0 ? { minHeight: shelfMinHeight } : undefined}
                                >
                                    {/* Inner stack carries real height; section min-height is only slack. */}
                                    <div className="flex flex-col gap-3">
                                        {hasUserBubble ? (
                                            <div className="lab-bubble-in pt-3">
                                                {turn.user?.autoRepair ? (
                                                    <AutoRepairCard
                                                        autoRepair={turn.user.autoRepair}
                                                        pending={isLatest && busy}
                                                    />
                                                ) : (
                                                    <ChatMessage
                                                        message={{
                                                            id: `${turn.id}-u`,
                                                            role: 'user',
                                                            content: turn.user.text,
                                                            attachments: turn.user.files,
                                                            editTargets: turn.user.editTargets,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ) : null}

                                        {/*
                                          Always mount TurnActivity once any assistant chrome exists.
                                          Tool cards paint inside it — never replace/unmount the
                                          thinking row by swapping this subtree for tools-only UI.
                                        */}
                                        {hasAssistant ? (
                                            <TurnActivity
                                                key={`${turn.id}-activity`}
                                                turn={turn}
                                                isLatest={isLatest}
                                                busy={busy}
                                                building={building}
                                                showGate={showGate}
                                                onOpenPath={onOpenPath}
                                                onOpenConsole={onOpenConsole}
                                                onSkipGate={onSkipGate}
                                                onAcceptGate={onAcceptGate}
                                                onPickSuggestion={onPickSuggestion}
                                            />
                                        ) : null}
                                    </div>
                                </section>
                            )
                        })}
                    </div>
                )}
            </div>

            <FollowLatestButton
                visible={live && showFollowButton}
                onClick={onResumeFollow}
            />
        </div>
    )
}
