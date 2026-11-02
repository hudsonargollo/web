import { RAIL_MAX_W, RAIL_MIN_W } from '../lib/labConstants'
import { ChatStream } from './ChatStream'
import { EmptyLabHero } from './EmptyLabHero'
import { LabComposerBar } from './LabComposerBar'

/**
 * Left chat rail: hero, stream, composer, resize handle.
 */
export function ChatColumn({
    live,
    building,
    busy,
    railW,
    railResizing,
    chatRailRef,
    onRailResizeStart,
    // stream
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
    // composer
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
    // Landing hero only before the first message AND before workspace opens.
    // Opening workspace with an empty thread must still use the narrow rail —
    // otherwise chat + preview both take flex-1 and split 50/50.
    const landing = ! live && ! building

    return (
        <div
            ref={chatRailRef}
            className={[
                'lab-layout-pane relative flex min-h-0 min-w-0 flex-col overflow-hidden',
                building
                    ? [
                        'lab-chat-rail max-w-none border-r border-krikkit-line/80 bg-krikkit-canvas',
                        railW == null ? 'flex-[0_0_22rem] sm:flex-[0_0_24rem]' : '',
                    ].filter(Boolean).join(' ')
                    : 'w-full flex-[1_1_0%] bg-transparent',
                railResizing ? 'lab-rail-resizing' : '',
            ].join(' ')}
            style={building && railW != null
                ? { flex: `0 0 ${railW}px`, width: railW, maxWidth: railW }
                : undefined}
        >
            {/* Collapse in place — unmounting pops the composer instead of morphing. */}
            <div
                className={['lab-layout-pane', landing ? 'min-h-[10vh] flex-[1_1_0%]' : 'min-h-0 flex-[0_0_0%]'].join(' ')}
                aria-hidden
            />

            <EmptyLabHero live={! landing} />

            <ChatStream
                live={live}
                building={building}
                busy={busy}
                turns={turns}
                shelfTurnId={shelfTurnId}
                shelfMinHeight={shelfMinHeight}
                laneRef={laneRef}
                threadStackRef={threadStackRef}
                latestRef={latestRef}
                bubbleRefs={bubbleRefs}
                showFollowButton={showFollowButton}
                onResumeFollow={onResumeFollow}
                onOpenPath={onOpenPath}
                onOpenConsole={onOpenConsole}
                onSkipGate={onSkipGate}
                onAcceptGate={onAcceptGate}
                onPickSuggestion={onPickSuggestion}
            />

            <LabComposerBar
                live={live}
                building={building}
                busy={busy}
                draft={draft}
                onDraftChange={onDraftChange}
                onSend={onSend}
                onStop={onStop}
                files={files}
                onAddFiles={onAddFiles}
                onRemoveFile={onRemoveFile}
                turnStatusLabel={turnStatusLabel}
                fixErrorTarget={fixErrorTarget}
                onFixError={onFixError}
                onDismissFixError={onDismissFixError}
                onImportGithub={onImportGithub}
                inspecting={inspecting}
                onToggleInspect={onToggleInspect}
                inspectAvailable={inspectAvailable}
                editTargets={editTargets}
                onRemoveEditTarget={onRemoveEditTarget}
            />

            {building && (
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize chat"
                    aria-valuenow={railW ?? 384}
                    aria-valuemin={RAIL_MIN_W}
                    aria-valuemax={RAIL_MAX_W}
                    onPointerDown={onRailResizeStart}
                    className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none"
                />
            )}

            <div
                className={['lab-layout-pane', landing ? 'min-h-[10vh] flex-[1_1_0%]' : 'min-h-0 flex-[0_0_0%]'].join(' ')}
                aria-hidden
            />
        </div>
    )
}
