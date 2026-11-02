import { useId, useState } from 'react'
import { ToolStatusText } from './ToolStatusText'
import { IconChevron, IconCylinder } from './toolIcons'

/**
 * Quiet chat chrome for survey_datastore / revise_datastore.
 */
export function DatastoreCard({
    mode = 'survey',
    status = 'done',
    tableCount = 0,
    tables = [],
    statementCount = 0,
    destructive = false,
    summary = '',
    staticEnter = false,
}) {
    const panelId = useId()
    const [isOpen, setIsOpen] = useState(false)
    const waiting = status === 'waiting'
    const surveying = status === 'running' || status === 'surveying'
    const revising = status === 'revising'
    const skipped = status === 'skipped' || status === 'cancelled'
    const pending = waiting || surveying || revising || status === 'error'

    const label = mode === 'revision'
        ? (waiting
            ? 'Waiting for Supabase…'
            : (revising
                ? 'Revising datastore…'
                : (status === 'error'
                    ? 'Datastore revision failed'
                    : (skipped ? 'Skipped datastore revision' : 'Applied datastore revision'))))
        : (waiting
            ? 'Waiting for Supabase…'
            : (surveying
                ? 'Surveying datastore…'
                : (status === 'error'
                    ? 'Datastore survey failed'
                    : (skipped ? 'Skipped datastore' : 'Surveyed datastore'))))

    const meta = mode === 'revision'
        ? (statementCount ? `${statementCount} statement${statementCount === 1 ? '' : 's'}` : '')
        : (tableCount ? `${tableCount} table${tableCount === 1 ? '' : 's'}` : '')

    const rows = Array.isArray(tables) ? tables.slice(0, 24) : []
    const hasBody = rows.length > 0 || Boolean(summary)

    return (
        <div
            className={['lab-crest-enter min-w-0', staticEnter ? 'lab-crest-enter--static' : ''].join(' ')}
            role="region"
            aria-label={label}
            data-lab-chrome="datastore"
        >
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={hasBody && isOpen ? panelId : undefined}
                onClick={() => hasBody && setIsOpen((open) => ! open)}
                className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit group text-krikkit-muted transition-colors hover:text-krikkit-fg-soft"
            >
                <IconCylinder />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight">
                    <ToolStatusText text={label} pending={pending && status !== 'error'} />
                </span>
                {meta && status === 'done' ? (
                    <span className="inline-flex shrink-0 items-center gap-1 leading-tight text-krikkit-subtle">
                        {meta}
                        {destructive ? ' · destructive' : ''}
                    </span>
                ) : null}
                {hasBody ? <IconChevron open={isOpen} /> : null}
            </button>

            {hasBody && isOpen ? (
                <div id={panelId} data-state="open" className="lab-tool-collapse">
                    <div className="lab-tool-collapse__clip">
                        <div className="lab-tool-collapse__body bg-krikkit-soft border border-krikkit-line krikkit-scroll-hover max-h-52 overflow-auto rounded-xl py-1">
                            {summary ? (
                                <p className="px-3 py-1.5 text-[12px] text-krikkit-fg-soft">{summary}</p>
                            ) : null}
                            {rows.length ? (
                                <ul className="list-none">
                                    {rows.map((table) => {
                                        const name = typeof table === 'string' ? table : table?.name
                                        const cols = Array.isArray(table?.columns) ? table.columns : []
                                        return (
                                            <li key={name} className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-[12px]">
                                                <span className="truncate text-krikkit-fg">{name}</span>
                                                <span className="ml-auto shrink-0 text-[10px] text-krikkit-subtle">
                                                    {cols.length} col{cols.length === 1 ? '' : 's'}
                                                </span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
