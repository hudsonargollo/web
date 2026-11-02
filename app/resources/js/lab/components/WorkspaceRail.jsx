import { CodeCanvas } from './CodeCanvas'
import { FilesBrowser } from './FilesBrowser'
import { WorkspaceStage } from './WorkspaceStage'

/**
 * Workspace panels: editor, files browser, preview/console stage.
 */
export function WorkspaceRail({
    building,
    layoutInstant,
    composeMode,
    workspaceView,
    draftBuffers,
    fileTree,
    filesLoading,
    filesError,
    projectUuid,
    previewLive,
    previewContents,
    vfsApi,
    projectTitle,
    isAiStreaming,
    aiWriting = false,
    previewReloadPending = false,
    aiBusy = false,
    turnStatusLabel = '',
    thinkingLive = false,
    consoleSessionLog,
    openConsoleSignal,
    onChangeBuffer,
    onOpenFile,
    inspecting = false,
    onInspectSelect = null,
    onInspectStop = null,
    inspectedElement = null,
    onInspectClear = null,
    inspectApplyRef = null,
    onAskLab = null,
    onStartInspect = null,
    onPinPreviewEdit = null,
    autoSave = false,
    onToggleAutoSave = null,
    onConnectDatastore = null,
    onChangeDatastore = null,
}) {
    return (
        <div
            className={[
                'lab-layout-pane min-h-0 min-w-0 overflow-hidden',
                building
                    ? 'flex-[1_1_0%] opacity-100'
                    : 'pointer-events-none flex-[0_0_0%] opacity-0',
            ].join(' ')}
            aria-hidden={! building}
        >
            {building && (
                <div className={[
                    'flex h-full min-h-0 w-full',
                    layoutInstant ? 'lab-no-transition' : '',
                ].join(' ')}
                >
                    {/* Editor expands from 0 → flex-1 when a file opens */}
                    <div
                        className={[
                            'lab-layout-pane relative min-h-0 overflow-hidden',
                            composeMode === 'draft'
                                ? 'flex-[1_1_0%] opacity-100'
                                : 'pointer-events-none flex-[0_0_0%] opacity-0',
                        ].join(' ')}
                        aria-hidden={composeMode !== 'draft'}
                    >
                        {(workspaceView.editorPaths?.length
                            ? workspaceView.editorPaths
                            : (workspaceView.activePath ? [workspaceView.activePath] : [])
                        ).map((path) => (
                            <CodeCanvas
                                key={path}
                                path={path}
                                value={draftBuffers[path] ?? ''}
                                active={composeMode === 'draft' && workspaceView.activePath === path}
                                onChange={(next) => onChangeBuffer(path, next)}
                            />
                        ))}
                    </div>

                    {/* Files: full stage → shrinks into right rail */}
                    <div
                        className={[
                            'lab-layout-pane min-h-0 overflow-hidden',
                            composeMode === 'draft'
                                ? 'w-72 max-w-[18rem] flex-[0_0_18rem] border-l border-krikkit-line/80 opacity-100 sm:flex-[0_0_18rem]'
                                : workspaceView.panel === 'files'
                                    ? 'flex-[1_1_0%] opacity-100'
                                    : 'pointer-events-none flex-[0_0_0%] opacity-0',
                        ].join(' ')}
                        aria-hidden={composeMode !== 'draft' && workspaceView.panel !== 'files'}
                    >
                        <FilesBrowser
                            entries={fileTree}
                            loading={filesLoading}
                            error={filesError}
                            compact={composeMode === 'draft'}
                            activePath={workspaceView.activePath}
                            onOpenFile={onOpenFile}
                            emptyHint={projectUuid
                                ? 'Workspace is empty.'
                                : 'Send a Lab message to create the site workspace.'}
                        />
                    </div>

                    {/* Console / preview / other — hidden while drafting */}
                    <div
                        className={[
                            'lab-layout-pane min-h-0 overflow-hidden',
                            composeMode !== 'draft' && workspaceView.panel !== 'files'
                                ? 'flex-[1_1_0%] opacity-100'
                                : 'pointer-events-none flex-[0_0_0%] opacity-0',
                        ].join(' ')}
                        aria-hidden={composeMode === 'draft' || workspaceView.panel === 'files'}
                    >
                        <WorkspaceStage
                            panel={workspaceView.panel}
                            activeTabId={workspaceView.tabId}
                            consoleIds={workspaceView.consoleIds}
                            previewLive={previewLive}
                            vfsContents={previewContents}
                            vfs={vfsApi}
                            projectTitle={projectTitle}
                            projectUuid={projectUuid}
                            isAiStreaming={isAiStreaming}
                            aiWriting={aiWriting}
                            previewReloadPending={previewReloadPending}
                            aiBusy={aiBusy}
                            turnStatusLabel={turnStatusLabel}
                            thinkingLive={thinkingLive}
                            consoleSessionLog={consoleSessionLog}
                            consoleFocusNonce={openConsoleSignal?.nonce || 0}
                            inspecting={inspecting}
                            onInspectSelect={onInspectSelect}
                            onInspectStop={onInspectStop}
                            inspectedElement={inspectedElement}
                            onInspectClear={onInspectClear}
                            inspectApplyRef={inspectApplyRef}
                            onAskLab={onAskLab}
                            onStartInspect={onStartInspect}
                            onPinPreviewEdit={onPinPreviewEdit}
                            autoSave={autoSave}
                            onToggleAutoSave={onToggleAutoSave}
                            onConnectDatastore={onConnectDatastore}
                            onChangeDatastore={onChangeDatastore}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
