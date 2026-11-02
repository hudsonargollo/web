import { ToolStatusText } from './ToolStatusText'
import { IconCheck } from './toolIcons'
import { isToolLogLabel } from '../lib/toolActivity'

/**
 * High-level turn checklist from the LLM <todos> plan only.
 * Tool-execution phrases are filtered out — they stay on the classic tool cards.
 */
export function TodoCard({
    items = [],
    status = 'done',
    staticEnter = false,
}) {
    const itemsSafe = (Array.isArray(items) ? items : []).filter((item) => (
        item
        && String(item.label || '').trim()
        && ! isToolLogLabel(item.label)
    ))
    const total = itemsSafe.length
    if (! total && status !== 'running') return null

    const done = itemsSafe.filter((item) => item.status === 'done').length
    const errored = status === 'error' || itemsSafe.some((item) => item.status === 'error')
    const pending = status === 'running' || (! errored && done < total)
    const label = errored
        ? 'Checklist incomplete'
        : pending
            ? 'Working through checklist'
            : 'Checklist complete'

    return (
        <div
            className={['lab-crest-enter min-w-0', staticEnter ? 'lab-crest-enter--static' : ''].join(' ')}
            role="region"
            aria-label={label}
            data-lab-chrome="todos"
        >
            <div className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit text-krikkit-muted">
                <IconCheck />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight">
                    <ToolStatusText text={label} pending={pending && done < total} />
                </span>
                {total > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 leading-tight text-krikkit-subtle tabular-nums">
                        {done}/{total}
                    </span>
                )}
            </div>

            {total > 0 && (
                <ul className="mt-1.5 space-y-0.5 border-l border-krikkit-line pl-3">
                    {itemsSafe.map((item) => {
                        const isDone = item.status === 'done'
                        const isActive = item.status === 'active'
                        const isError = item.status === 'error'
                        return (
                            <li
                                key={item.id}
                                className={[
                                    'flex items-center gap-2 text-[12px] leading-5',
                                    isDone ? 'text-krikkit-subtle line-through' : '',
                                    isActive ? 'text-krikkit-fg' : '',
                                    isError ? 'text-red-500' : '',
                                    ! isDone && ! isActive && ! isError ? 'text-krikkit-muted' : '',
                                ].join(' ')}
                            >
                                <span
                                    className={[
                                        'inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                                        isDone
                                            ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-500'
                                            : isError
                                                ? 'border-red-500/60 bg-red-500/10 text-red-500'
                                                : 'border-krikkit-line text-transparent',
                                    ].join(' ')}
                                    aria-hidden
                                >
                                    {isError ? '!' : <IconCheck className="h-2.5 w-2.5" />}
                                </span>
                                <span className="min-w-0 truncate">{item.label}</span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
