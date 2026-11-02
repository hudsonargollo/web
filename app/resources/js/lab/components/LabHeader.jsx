import { LAB_BTN_PRIMARY } from '../lib/labConstants'
import { LabGlyph } from './Icons'
import { ManualWorkspaceButton } from './ManualWorkspaceButton'
import { WorkspaceTabs } from './WorkspaceTabs'
import { CreditBalanceBadge } from './CreditBalanceBadge'

function IconGlobe({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.75" />
            <path
                d="M3.75 12h16.5M12 3.75c2.4 2.4 3.6 5.15 3.6 8.25s-1.2 5.85-3.6 8.25M12 3.75C9.6 6.15 8.4 8.9 8.4 12s1.2 5.85 3.6 8.25"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    )
}

export function LabHeader({
    building,
    railW,
    railResizing,
    crumbTitle,
    busy,
    projectUuid = null,
    onOpenWorkspace,
    dirtyPaths,
    openFileSignal,
    openConsoleSignal,
    openPreviewSignal,
    openTablesSignal = null,
    onPanelChange,
    onRequestCloseTab,
    onWorkspaceCommand = null,
    onPublish = null,
    publishStatus = 'idle',
}) {
    return (
        <header className="lab-app-header flex h-14 shrink-0 items-stretch overflow-hidden border-b border-krikkit-line bg-krikkit-canvas">
            {/* Same flex basis as chat rail → invisible edge stays aligned on morph/resize */}
            <div
                className={[
                    'lab-layout-pane flex min-w-0 items-center px-4 sm:px-6',
                    building
                        ? [
                            'overflow-hidden border-r border-krikkit-line/80',
                            railW == null ? 'flex-[0_0_22rem] sm:flex-[0_0_24rem]' : '',
                        ].filter(Boolean).join(' ')
                        : 'w-full flex-[1_1_0%]',
                    railResizing ? 'lab-rail-resizing' : '',
                ].join(' ')}
                style={building && railW != null
                    ? { flex: `0 0 ${railW}px`, width: railW, maxWidth: railW }
                    : undefined}
            >
                <a href="/" className="inline-flex h-5 items-center truncate text-sm font-semibold leading-none tracking-tight text-krikkit-fg">
                    Krikkit
                </a>
                <span className="mx-2 shrink-0 text-krikkit-subtle" aria-hidden>/</span>
                <a
                    href="/lab"
                    className={[
                        'inline-flex h-5 shrink-0 items-center gap-1.5 text-sm leading-none transition',
                        crumbTitle
                            ? 'text-krikkit-muted hover:text-krikkit-fg'
                            : 'font-medium text-krikkit-fg',
                    ].join(' ')}
                >
                    <LabGlyph />
                    Lab
                </a>
                {crumbTitle && (
                    <>
                        <span className="mx-2 shrink-0 text-krikkit-subtle" aria-hidden>/</span>
                        <span className="inline-flex h-5 min-w-0 items-center truncate text-sm font-medium leading-none text-krikkit-fg" title={crumbTitle}>
                            {crumbTitle}
                        </span>
                    </>
                )}
                <div className="ml-auto flex h-5 shrink-0 items-center gap-3 pl-3">
                    <CreditBalanceBadge inProject={Boolean(projectUuid)} />
                    <ManualWorkspaceButton
                        visible={! building}
                        disabled={busy}
                        onClick={onOpenWorkspace}
                    />
                </div>
            </div>

            {building && (
                <div className="lab-layout-pane flex min-h-0 min-w-0 flex-[1_1_0%] items-stretch pl-3 pr-4 sm:pr-6">
                    <WorkspaceTabs
                        onPanelChange={onPanelChange}
                        openFileSignal={openFileSignal}
                        openConsoleSignal={openConsoleSignal}
                        openPreviewSignal={openPreviewSignal}
                        openTablesSignal={openTablesSignal}
                        dirtyPaths={dirtyPaths}
                        onRequestCloseTab={onRequestCloseTab}
                        onWorkspaceCommand={onWorkspaceCommand}
                    />
                    {projectUuid && onPublish ? (
                        <div className="flex shrink-0 items-center pl-2">
                            <button
                                type="button"
                                onClick={onPublish}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium ${LAB_BTN_PRIMARY}`}
                            >
                                <IconGlobe className="h-3.5 w-3.5" />
                                Publish
                                {publishStatus === 'live' ? (
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Live" />
                                ) : publishStatus === 'building' ? (
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="Publishing" />
                                ) : null}
                            </button>
                        </div>
                    ) : null}
                </div>
            )}
        </header>
    )
}
