import { ToolStatusText } from './ToolStatusText'
import { IconDiff } from './toolIcons'

/**
 * Quiet chrome for github_* catalog tools.
 */
export function GithubToolCard({
    tool = 'github_status',
    status = 'done',
    summary = '',
    staticEnter = false,
}) {
    const pending = status === 'running' || status === 'waiting'
    const skipped = status === 'skipped' || status === 'cancelled'
    const label = skipped
        ? `Skipped ${tool}`
        : (status === 'error'
            ? `${tool} failed`
            : (pending ? `Running ${tool}…` : `Ran ${tool}`))

    return (
        <div
            className={['lab-crest-enter min-w-0', staticEnter ? 'lab-crest-enter--static' : ''].join(' ')}
            role="region"
            aria-label={label}
            data-lab-chrome="github"
        >
            <div className="inline-flex w-full max-w-full min-h-5 min-w-0 items-center justify-start gap-1.5 text-[13px] font-normal leading-5 text-krikkit-muted">
                <IconDiff />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight">
                    <ToolStatusText text={label} pending={pending && status !== 'error'} />
                </span>
            </div>
            {summary ? (
                <p className="mt-0.5 pl-5 text-[12px] leading-5 text-krikkit-subtle">{summary}</p>
            ) : null}
        </div>
    )
}
