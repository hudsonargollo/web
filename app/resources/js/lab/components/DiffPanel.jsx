import { HighlightedCode } from '../lib/syntaxHighlight'

function DiffRow({ row, path }) {
    if (row.type === 'gap') {
        const n = Math.max(0, Number(row.count) || 0)
        return (
            <div className="flex items-center gap-3 px-2 py-2">
                <span className="h-px flex-1 bg-krikkit-line" aria-hidden />
                <span className="shrink-0 text-[11px] font-normal tabular-nums text-krikkit-subtle">
                    {n} unmodified line{n === 1 ? '' : 's'}
                </span>
                <span className="h-px flex-1 bg-krikkit-line" aria-hidden />
            </div>
        )
    }

    const isDel = row.type === 'del'
    const isAdd = row.type === 'add'
    const marker = isDel ? '-' : isAdd ? '+' : ''
    const lineNo = row.line != null ? String(row.line) : ''

    return (
        <div
            className={[
                'lab-write-row grid grid-cols-[2.5rem_0.875rem_minmax(0,1fr)] items-start font-mono text-[12px] font-normal leading-6',
                isDel ? 'lab-write-row--del' : '',
                isAdd ? 'lab-write-row--add' : '',
            ].join(' ')}
        >
            <span className="select-none pr-1.5 text-right tabular-nums text-krikkit-subtle/80">
                {lineNo}
            </span>
            <span
                className={[
                    'select-none text-center font-normal',
                    isDel ? 'text-red-500' : '',
                    isAdd ? 'text-emerald-500' : '',
                ].join(' ')}
                aria-hidden={! marker}
            >
                {marker}
            </span>
            <HighlightedCode
                code={row.text ?? ''}
                path={path}
                className="block min-w-0 whitespace-pre pr-3 font-normal"
            />
        </div>
    )
}

export function DiffPanel({ path = '', rows = [], label = 'Diff' }) {
    return (
        <div
            className="lab-write-diff bg-krikkit-soft border border-krikkit-line krikkit-scroll-hover max-h-64 overflow-auto rounded-xl py-1"
            role="table"
            aria-label={label}
        >
            {rows.map((row, i) => (
                <DiffRow
                    key={`${row.type}-${row.line ?? 'g'}-${i}`}
                    row={row}
                    path={path}
                />
            ))}
        </div>
    )
}

export function countDiffRows(rows = []) {
    let added = 0
    let removed = 0
    for (const row of rows) {
        if (row.type === 'add') added += 1
        else if (row.type === 'del') removed += 1
    }
    return { added, removed }
}
