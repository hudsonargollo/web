import { BuildGateCard } from './BuildGateCard'
import { AssistantAvatar, ChatMessage } from './ChatMessage'
import { ChatThinking } from './ChatThinking'
import { EditFileCard } from './EditFileCard'
import { FetchCard } from './FetchCard'
import { FileSearchCard } from './FileSearchCard'
import { GrepCard } from './GrepCard'
import { ListDirCard } from './ListDirCard'
import { OrchestrationCallout } from './OrchestrationCallout'
import { ReadFileCard } from './ReadFileCard'
import { ShellCard } from './ShellCard'
import { SuggestionChips } from './SuggestionChips'
import { TodoCard } from './TodoCard'
import { TurnWaitStatus } from './TurnWaitStatus'
import { VfsHealBadge } from './VfsHealBadge'
import { WriteFileCard } from './WriteFileCard'
import { DatastoreCard } from './DatastoreCard'
import { GithubToolCard } from './GithubToolCard'
import { LookupVisualsCard } from './LookupVisualsCard'
import { turnToolStack } from '../lib/labTurns'
import { readLabAutoSwitchGate } from '../lib/labConfig'
import { scrubLookupVisualQueries } from '../lib/labChatText'

/**
 * Per-turn activity: thinking, checklist, then tool cards in execution order.
 * One chronological stream — not type-grouped buckets.
 */
export function TurnActivity({
    turn,
    isLatest,
    busy,
    building,
    showGate,
    onOpenPath,
    onOpenConsole,
    onSkipGate,
    onAcceptGate,
    onPickSuggestion,
}) {
    const gateAutoSwitch = readLabAutoSwitchGate()
    const showAvatar = ! building
    const suggestionItems = Array.isArray(turn.suggestions) ? turn.suggestions : []
    const showSuggestions = isLatest
        && ! busy
        && ! showGate
        && ! building
        && suggestionItems.length > 0
        && Boolean(onPickSuggestion)
    const thinkingKey = `${turn.id}-thinking`
    const hasThinking = Boolean(turn.thinking)
    const stack = turnToolStack(turn)
    const lookupQueries = stack
        .filter((row) => row.kind === 'lookupVisuals')
        .map((row) => row.query)
    const botText = scrubLookupVisualQueries(turn.bot, lookupQueries)
    const followUpText = scrubLookupVisualQueries(turn.botFollowUp, lookupQueries)
    const hasToolChrome = stack.length > 0
    const waitLabel = typeof turn.turnStatus === 'string' ? turn.turnStatus.trim() : ''
    const showWait = Boolean(waitLabel)
        && (
            (isLatest && busy)
            || (! hasThinking && ! botText)
        )
    const waitInSlot = showWait && ! hasThinking && ! hasToolChrome && ! botText
    // Any active status (Thinking…, Starting build…, Applying changes…)
    // stays visible at the foot while the turn is running — not just the model wait.
    const waitAtFoot = Boolean(waitLabel)
        && isLatest
        && busy
        && (hasToolChrome || hasThinking || Boolean(botText))

    return (
        <div
            className={[
                'grid min-w-0 items-start',
                showAvatar
                    ? 'grid-cols-[20px_minmax(0,1fr)] gap-x-2.5'
                    : 'grid-cols-[0_minmax(0,1fr)] gap-x-0',
            ].join(' ')}
        >
            <div
                className={['flex size-5 items-center justify-center leading-none', showAvatar ? '' : 'overflow-hidden'].filter(Boolean).join(' ')}
                aria-hidden={! showAvatar}
            >
                {showAvatar ? <AssistantAvatar /> : null}
            </div>
            <div className="flex min-w-0 flex-col gap-3.5">
                {hasThinking ? (
                    <ChatThinking
                        key={thinkingKey}
                        isStreaming={turn.thinking.status === 'streaming' && ! turn.bot}
                        duration={turn.thinking.durationSec}
                        startedAt={turn.thoughtStartedAt}
                        content={turn.thinking.text}
                        forceCollapsed={Boolean(turn.bot)}
                    />
                ) : waitInSlot ? (
                    <TurnWaitStatus
                        key={`${turn.id}-wait`}
                        label={waitLabel}
                        startedAt={turn.waitStartedAt}
                        running={isLatest && busy}
                    />
                ) : null}

                {botText && turn.buildGate === 'accepted' && (
                    <div>
                        <ChatMessage
                            hideAvatar
                            isStreaming={false}
                            message={{
                                id: `${turn.id}-b`,
                                role: 'assistant',
                                content: botText,
                            }}
                        />
                    </div>
                )}

                {turn.todos && (
                    <TodoCard
                        items={turn.todos.items}
                        status={turn.todos.status}
                        staticEnter={! busy}
                    />
                )}

                {stack.map((row, index) => {
                    const key = `${row.kind}-${row.matchKey || row.path || index}`
                    switch (row.kind) {
                        case 'listDir':
                            return (
                                <ListDirCard
                                    key={key}
                                    path={row.path}
                                    status={row.status}
                                    items={row.items}
                                    staticEnter={! busy}
                                    onOpenPath={onOpenPath}
                                />
                            )
                        case 'fileSearch':
                            return (
                                <FileSearchCard
                                    key={key}
                                    query={row.query}
                                    status={row.status}
                                    hits={row.hits}
                                    onOpenPath={onOpenPath}
                                />
                            )
                        case 'grep':
                            return (
                                <GrepCard
                                    key={key}
                                    pattern={row.pattern}
                                    status={row.status}
                                    hits={row.hits}
                                    onOpenPath={onOpenPath}
                                />
                            )
                        case 'readFile':
                            return (
                                <ReadFileCard
                                    key={key}
                                    path={row.path}
                                    status={row.status}
                                    content={row.content}
                                    fullContent={row.fullContent}
                                    lineCount={row.lineCount}
                                    startLine={row.startLine}
                                    endLine={row.endLine}
                                    readRange={row.readRange}
                                />
                            )
                        case 'editFile':
                            return (
                                <EditFileCard
                                    key={key}
                                    path={row.path}
                                    status={row.status}
                                    rows={row.rows}
                                />
                            )
                        case 'shell':
                            return (
                                <ShellCard
                                    key={key}
                                    command={row.command}
                                    status={row.status}
                                    exitCode={row.exitCode}
                                    lines={row.lines}
                                    truncated={row.truncated}
                                    onOpenConsole={onOpenConsole}
                                />
                            )
                        case 'fetch':
                            return (
                                <FetchCard
                                    key={key}
                                    url={row.url}
                                    status={row.status}
                                    httpStatus={row.httpStatus}
                                    ok={row.ok}
                                    body={row.body}
                                />
                            )
                        case 'writeFile':
                            return (
                                <WriteFileCard
                                    key={key}
                                    path={row.path}
                                    status={row.status}
                                    detail={row.detail}
                                    rows={Array.isArray(row.rows) ? row.rows : []}
                                    staticEnter={! busy}
                                />
                            )
                        case 'vfsHeal':
                            return (
                                <VfsHealBadge
                                    key={key}
                                    count={row.count || 0}
                                    active={row.status === 'active'}
                                    onOpenTerminal={onOpenConsole}
                                    staticEnter={! busy}
                                />
                            )
                        case 'datastoreSurvey':
                            return (
                                <DatastoreCard
                                    key={key}
                                    mode="survey"
                                    status={row.status}
                                    tableCount={row.tableCount}
                                    tables={row.tables}
                                    summary={row.summary}
                                    staticEnter={! busy}
                                />
                            )
                        case 'datastoreRevision':
                            return (
                                <DatastoreCard
                                    key={key}
                                    mode="revision"
                                    status={row.status}
                                    statementCount={row.statementCount}
                                    destructive={row.destructive}
                                    summary={row.summary}
                                    staticEnter={! busy}
                                />
                            )
                        case 'lookupVisuals':
                            return (
                                <LookupVisualsCard
                                    key={key}
                                    status={row.status}
                                    count={row.count}
                                    staticEnter={! busy}
                                />
                            )
                        case 'github':
                            return (
                                <GithubToolCard
                                    key={key}
                                    tool={row.tool}
                                    status={row.status}
                                    summary={row.summary}
                                    staticEnter={! busy}
                                />
                            )
                        default:
                            return null
                    }
                })}

                {botText && turn.buildGate !== 'accepted' && (
                    <div className={turn.thinking || turn.todos || hasToolChrome ? 'pt-1' : ''}>
                        <ChatMessage
                            hideAvatar
                            isStreaming={
                                busy
                                && isLatest
                                && turn.buildGate !== 'skipped'
                                && ! turn.skipDivider
                            }
                            message={{
                                id: `${turn.id}-b`,
                                role: 'assistant',
                                content: botText,
                            }}
                        />
                    </div>
                )}

                {showSuggestions ? (
                    <SuggestionChips
                        items={suggestionItems}
                        onPick={onPickSuggestion}
                    />
                ) : null}

                {(turn.skipDivider || turn.buildGate === 'skipped') ? (
                    <div
                        className="my-2 border-t border-krikkit-line"
                        role="separator"
                        aria-hidden="true"
                    />
                ) : null}

                {(followUpText
                    || (busy && isLatest && (
                        turn.skipDivider
                        || turn.buildGate === 'skipped'
                    ))) ? (
                    <div>
                        <ChatMessage
                            hideAvatar
                            isStreaming={
                                busy
                                && isLatest
                                && (
                                    turn.skipDivider
                                    || turn.buildGate === 'skipped'
                                    || turn.buildGate === 'accepted'
                                )
                            }
                            message={{
                                id: `${turn.id}-bf`,
                                role: 'assistant',
                                content: followUpText,
                            }}
                        />
                    </div>
                ) : null}

                {turn.callouts?.length ? (
                    <OrchestrationCallout items={turn.callouts} />
                ) : null}

                {waitAtFoot ? (
                    <TurnWaitStatus
                        label={waitLabel}
                        startedAt={turn.waitStartedAt}
                        running
                    />
                ) : null}

                {showGate && (
                    <BuildGateCard
                        autoSwitch={gateAutoSwitch.enabled}
                        durationMs={gateAutoSwitch.durationMs}
                        onSkip={() => onSkipGate(turn.id)}
                        onSwitch={() => onAcceptGate(turn.id)}
                    />
                )}
            </div>
        </div>
    )
}
