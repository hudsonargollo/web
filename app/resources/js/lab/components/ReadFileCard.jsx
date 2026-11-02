import { useId, useMemo, useState } from 'react'
import { HighlightedCode } from '../lib/syntaxHighlight'
import { ToolStatusText } from './ToolStatusText'
import { IconChevron, IconEye, fileName } from './toolIcons'

function statusVerb(status) {
    return status === 'reading' ? 'Reading' : 'Read'
}

function parseRangeToken(raw) {
    const text = String(raw || '').trim()
    const match = text.match(/^(\d+)\s*[-–—]\s*(\d+)$/)
    if (! match) return null
    const start = Number(match[1])
    const end = Number(match[2])
    if (! Number.isFinite(start) || ! Number.isFinite(end)) return null
    return {
        startLine: Math.max(1, start),
        endLine: Math.max(start, end),
    }
}

/**
 * Resolve the strict window shown in the card.
 * Prefers fullContent + readRange; falls back to slicing oversized content.
 */
function resolveReadWindow({
    content = '',
    fullContent = null,
    lineCount = 0,
    startLine = null,
    endLine = null,
    readRange = null,
} = {}) {
    const fromRange = readRange && typeof readRange === 'object'
        ? {
            startLine: readRange.startLine ?? readRange.start_line ?? null,
            endLine: readRange.endLine ?? readRange.end_line ?? null,
        }
        : typeof readRange === 'string'
            ? parseRangeToken(readRange)
            : null

    let lo = fromRange?.startLine ?? startLine
    let hi = fromRange?.endLine ?? endLine
    if ((lo == null || hi == null) && typeof startLine === 'string') {
        const parsed = parseRangeToken(startLine)
        if (parsed) {
            lo = parsed.startLine
            hi = parsed.endLine
        }
    }

    const fullSource = fullContent != null && String(fullContent) !== ''
        ? String(fullContent)
        : null
    const windowSource = content != null ? String(content) : ''
    const fullLines = fullSource == null ? null : (fullSource === '' ? [] : fullSource.split('\n'))
    const contentLines = windowSource === '' ? [] : windowSource.split('\n')
    const total = Math.max(
        Number(lineCount) || 0,
        fullLines?.length || 0,
        contentLines.length,
    )

    if (lo == null && hi == null) {
        const rows = contentLines.map((text, i) => ({
            type: 'read',
            line: i + 1,
            text,
        }))
        return {
            rows,
            startLine: rows.length ? 1 : null,
            endLine: rows.length || null,
            totalLines: total || rows.length,
            beforeCount: 0,
            afterCount: 0,
        }
    }

    const start = Math.max(1, Number(lo) || 1)
    let end = Math.max(start, Number(hi) || start)
    if (total > 0) end = Math.min(end, total)

    let windowLines
    if (fullLines) {
        windowLines = fullLines.slice(start - 1, end)
    } else if (
        contentLines.length > (end - start + 1)
        || (total > 0 && contentLines.length >= total && total > end - start + 1)
    ) {
        windowLines = contentLines.slice(start - 1, end)
    } else {
        windowLines = contentLines
    }

    const expected = Math.max(0, end - start + 1)
    if (windowLines.length > expected) {
        windowLines = windowLines.slice(0, expected)
    }

    const rows = []
    const beforeCount = start > 1 ? start - 1 : 0
    const afterCount = total > end ? total - end : 0

    if (beforeCount > 0) {
        rows.push({ type: 'gap', count: beforeCount })
    }
    for (let i = 0; i < windowLines.length; i += 1) {
        rows.push({
            type: 'read',
            line: start + i,
            text: windowLines[i],
        })
    }
    if (afterCount > 0) {
        rows.push({ type: 'gap', count: afterCount })
    }

    return {
        rows,
        startLine: start,
        endLine: end,
        totalLines: total || end,
        beforeCount,
        afterCount,
    }
}

function rangeMetaLabel(startLine, endLine, totalLines) {
    if (startLine == null || endLine == null) {
        return totalLines > 0 ? `${totalLines} lines` : ''
    }
    const span = startLine === endLine
        ? `Line ${startLine}`
        : `Lines ${startLine}–${endLine}`
    if (totalLines > 0 && (startLine > 1 || endLine < totalLines)) {
        return `${span} of ${totalLines}`
    }
    return span
}

/**
 * Read file — structural clone of WriteFileCard / DiffPanel, adapted for reads.
 */
export function ReadFileCard({
    path = '',
    status = 'done',
    content = '',
    fullContent = null,
    lineCount = 0,
    startLine = null,
    endLine = null,
    readRange = null,
    defaultOpen = false,
    onOpenChange,
}) {
    const panelId = useId()
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const name = useMemo(() => fileName(path), [path])
    const verb = statusVerb(status)

    const readWindow = useMemo(
        () => resolveReadWindow({
            content,
            fullContent,
            lineCount,
            startLine,
            endLine,
            readRange,
        }),
        [content, fullContent, lineCount, startLine, endLine, readRange],
    )

    const hasBody = readWindow.rows.length > 0
    const meta = useMemo(
        () => rangeMetaLabel(readWindow.startLine, readWindow.endLine, readWindow.totalLines),
        [readWindow],
    )

    const toggle = () => {
        if (! hasBody) return
        const next = ! isOpen
        setIsOpen(next)
        onOpenChange?.(next)
    }

    return (
        <div
            className="lab-crest-enter min-w-0"
            role="region"
            aria-label={`${verb} ${path || name}`}
            data-lab-chrome="readFile"
        >
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={hasBody && isOpen ? panelId : undefined}
                onClick={toggle}
                className="inline-flex w-full max-w-full min-h-5 min-w-0 appearance-none items-center justify-start gap-1.5 border-0 bg-transparent p-0 m-0 text-left text-[13px] font-normal leading-5 text-inherit group text-krikkit-muted transition-colors hover:text-krikkit-fg-soft"
            >
                <IconEye />
                <span className="inline-flex min-h-3.5 min-w-0 flex-1 items-center overflow-hidden text-ellipsis whitespace-nowrap leading-tight" title={path || name}>
                    <ToolStatusText text={`${verb} ${name}`} pending={status === 'reading'} />
                </span>
                {meta ? (
                    <span className="inline-flex shrink-0 items-center gap-1 leading-tight" aria-label={meta}>
                        <span className="text-accent-content">{meta}</span>
                    </span>
                ) : null}
                {hasBody ? <IconChevron open={isOpen} /> : null}
            </button>

            {hasBody && isOpen ? (
                <div id={panelId} data-state="open" className="lab-tool-collapse">
                    <div className="lab-tool-collapse__clip">
                        <div className="lab-tool-collapse__body">
                            <ReadPanel
                                path={path}
                                rows={readWindow.rows}
                                label={`Read preview for ${path || name}`}
                            />
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

/** Pixel-matched clone of DiffPanel gap strip — read terminology. */
function UnreadGap({ count }) {
    const n = Math.max(0, Number(count) || 0)
    if (n <= 0) return null
    return (
        <div className="flex items-center gap-3 px-2 py-2">
            <span className="h-px flex-1 bg-krikkit-line" aria-hidden />
            <span className="shrink-0 text-[11px] font-normal tabular-nums text-krikkit-subtle">
                {`[... ${n} unread line${n === 1 ? '' : 's'} ...]`}
            </span>
            <span className="h-px flex-1 bg-krikkit-line" aria-hidden />
        </div>
    )
}

function ReadRow({ row, path }) {
    if (row.type === 'gap') {
        return <UnreadGap count={row.count} />
    }

    return (
        <div
            className={[
                'lab-write-row grid grid-cols-[2.5rem_0.875rem_minmax(0,1fr)] items-start font-mono text-[12px] font-normal leading-6',
                'lab-write-row--read',
            ].join(' ')}
        >
            <span className="select-none pr-1.5 text-right tabular-nums text-krikkit-subtle/80">
                {row.line != null ? String(row.line) : ''}
            </span>
            <span className="select-none text-center font-normal" aria-hidden />
            <HighlightedCode
                code={row.text ?? ''}
                path={path}
                className="block min-w-0 whitespace-pre pr-3 font-normal"
            />
        </div>
    )
}

function ReadPanel({ path = '', rows = [], label = 'Read' }) {
    return (
        <div
            className="lab-write-diff bg-krikkit-soft border border-krikkit-line krikkit-scroll-hover max-h-64 overflow-auto rounded-xl py-1"
            role="table"
            aria-label={label}
        >
            {rows.map((row, i) => (
                <ReadRow
                    key={`${row.type}-${row.line ?? 'g'}-${i}`}
                    row={row}
                    path={path}
                />
            ))}
        </div>
    )
}
