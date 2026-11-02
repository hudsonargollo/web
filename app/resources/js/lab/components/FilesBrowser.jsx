import { useEffect, useMemo, useState } from 'react'

function IconChevron({ open, className = 'h-3.5 w-3.5' }) {
    return (
        <svg
            className={[className, 'transition-transform', open ? 'rotate-90' : ''].join(' ')}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="m9 6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function IconFolder({ open, className = 'h-4 w-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
                <path
                    d="M3.75 8.5A1.75 1.75 0 0 1 5.5 6.75h3.6l1.5 1.5H18.5A1.75 1.75 0 0 1 20.25 10v6.75A1.75 1.75 0 0 1 18.5 18.5H5.5A1.75 1.75 0 0 1 3.75 16.75V8.5Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                />
            ) : (
                <path
                    d="M3.75 8.25A1.5 1.5 0 0 1 5.25 6.75h4.1l1.8 1.8h7.6a1.5 1.5 0 0 1 1.5 1.5v7.2a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                />
            )}
        </svg>
    )
}

function IconCode({ className = 'h-4 w-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M9.5 7.5 5 12l4.5 4.5M14.5 7.5 19 12l-4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function IconMarkdown({ className = 'h-4 w-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M5 7.5h14M5 12h10M5 16.5h8"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    )
}

function IconImage({ className = 'h-4 w-4' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
                x="3.75"
                y="5.75"
                width="16.5"
                height="12.5"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.75"
            />
            <circle cx="9" cy="10.5" r="1.35" fill="currentColor" />
            <path
                d="m8 16 3.2-3.2a1 1 0 0 1 1.35 0L16.5 16.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function FileKindIcon({ kind }) {
    if (kind === 'markdown') {
        return <IconMarkdown className="h-4 w-4 shrink-0 text-krikkit-fg" />
    }
    if (kind === 'image') {
        return <IconImage className="h-4 w-4 shrink-0 text-accent-content" />
    }
    return <IconCode className="h-4 w-4 shrink-0 text-krikkit-fg" />
}

function countTreeItems(nodes = []) {
    let n = 0
    const walk = (list) => {
        for (const node of list) {
            n += 1
            if (node.type === 'folder' && node.children?.length) walk(node.children)
        }
    }
    walk(nodes)
    return n
}

/** Folders start collapsed — user expands as needed. */
function defaultOpenFolders() {
    return new Set()
}

function collectFolderPaths(nodes = [], acc = new Set()) {
    for (const node of nodes) {
        if (node.type === 'folder') {
            acc.add(node.path)
            if (node.children?.length) collectFolderPaths(node.children, acc)
        }
    }
    return acc
}

/** Matches chevron width so file icons line up under folder icons. */
function TwistSpacer() {
    return <span className="lab-tree-twist inline-block w-3.5 shrink-0" aria-hidden />
}

function TreeNode({
    node,
    compact,
    activePath,
    openFolders,
    onToggleFolder,
    onOpenFile,
}) {
    const renderKids = (kids) => kids.map((child) => (
        <TreeNode
            key={child.id}
            node={child}
            compact={compact}
            activePath={activePath}
            openFolders={openFolders}
            onToggleFolder={onToggleFolder}
            onOpenFile={onOpenFile}
        />
    ))

    if (node.type === 'folder') {
        const open = openFolders.has(node.path)
        const childCount = node.children?.length ?? 0
        const branched = open && childCount > 0

        if (compact) {
            return (
                <li>
                    <button
                        type="button"
                        onClick={() => onToggleFolder(node.path)}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-krikkit-soft/70"
                        aria-expanded={open}
                    >
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                            <IconChevron open={open} className="lab-tree-twist h-3.5 w-3.5 shrink-0 text-krikkit-subtle" />
                            <IconFolder open={open} className="h-4 w-4 shrink-0 text-accent-content" />
                            <span className="min-w-0 truncate text-[13px] font-medium text-krikkit-fg">
                                {node.name}
                            </span>
                        </span>
                    </button>
                    {branched && (
                        <ul className="lab-tree-branch">
                            {renderKids(node.children)}
                        </ul>
                    )}
                </li>
            )
        }

        return (
            <li>
                <button
                    type="button"
                    onClick={() => onToggleFolder(node.path)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] items-center gap-2 rounded-lg px-3 py-2.5 text-left transition hover:bg-krikkit-soft"
                    aria-expanded={open}
                >
                    <span className="flex min-w-0 items-center gap-1.5">
                        <IconChevron open={open} className="lab-tree-twist h-3.5 w-3.5 shrink-0 text-krikkit-subtle" />
                        <IconFolder open={open} className="h-4 w-4 shrink-0 text-accent-content" />
                        <span className="min-w-0 truncate text-sm font-medium text-krikkit-fg">
                            {node.name}
                        </span>
                    </span>
                    <span className="justify-self-start">
                        <span className="inline-flex rounded-md bg-krikkit-soft px-2 py-0.5 text-[11px] tabular-nums text-krikkit-muted">
                            {childCount}
                        </span>
                    </span>
                    <span className="truncate text-right text-[12px] text-krikkit-muted">
                        {node.modifiedLabel}
                    </span>
                </button>
                {branched && (
                    <ul className="lab-tree-branch">
                        {renderKids(node.children)}
                    </ul>
                )}
            </li>
        )
    }

    const active = activePath === node.path

    if (compact) {
        return (
            <li>
                <button
                    type="button"
                    onClick={() => onOpenFile?.(node)}
                    className={[
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition',
                        active
                            ? 'bg-krikkit-soft text-krikkit-fg'
                            : 'text-krikkit-fg hover:bg-krikkit-soft/70',
                    ].join(' ')}
                >
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <TwistSpacer />
                        <FileKindIcon kind={node.kind} />
                        <span className="min-w-0 truncate text-[13px] font-medium">
                            {node.name}
                        </span>
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-krikkit-subtle">
                        {node.sizeLabel}
                    </span>
                </button>
            </li>
        )
    }

    return (
        <li>
            <button
                type="button"
                onClick={() => onOpenFile?.(node)}
                className={[
                    'grid w-full grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] items-center gap-2 rounded-lg px-3 py-2.5 text-left transition',
                    active ? 'bg-krikkit-soft' : 'hover:bg-krikkit-soft',
                ].join(' ')}
            >
                <span className="flex min-w-0 items-center gap-1.5">
                    <TwistSpacer />
                    <FileKindIcon kind={node.kind} />
                    <span className="truncate text-sm font-medium text-krikkit-fg">
                        {node.name}
                    </span>
                    {node.yours && (
                        <span className="shrink-0 rounded-md bg-krikkit-soft px-1.5 py-0.5 text-[10px] text-krikkit-subtle">
                            you
                        </span>
                    )}
                </span>
                <span className="justify-self-start">
                    <span className="inline-flex rounded-md bg-krikkit-soft px-2 py-0.5 text-[11px] tabular-nums text-krikkit-muted">
                        {node.sizeLabel}
                    </span>
                </span>
                <span className="truncate text-right text-[12px] text-krikkit-muted">
                    {node.modifiedLabel}
                </span>
            </button>
        </li>
    )
}

/**
 * Nested project file tree (disk-backed via Lab files API).
 * `compact` = right rail beside the editor.
 */
export function FilesBrowser({
    entries = [],
    onOpenFile,
    compact = false,
    activePath = null,
    loading = false,
    error = null,
    emptyHint = 'Create a Lab project to materialize the site kit.',
}) {
    const itemCount = useMemo(() => countTreeItems(entries), [entries])
    const [openFolders, setOpenFolders] = useState(() => defaultOpenFolders())

    useEffect(() => {
        // Keep expansions the user opened; drop paths that no longer exist.
        setOpenFolders((prev) => {
            if (prev.size === 0) return prev
            const alive = collectFolderPaths(entries)
            const next = new Set()
            for (const path of prev) {
                if (alive.has(path)) next.add(path)
            }
            return next
        })
    }, [entries])

    const onToggleFolder = (path) => {
        setOpenFolders((prev) => {
            const next = new Set(prev)
            if (next.has(path)) next.delete(path)
            else next.add(path)
            return next
        })
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-krikkit-canvas">
            <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-krikkit-line bg-krikkit-canvas px-3">
                <p className="min-w-0 truncate text-xs font-medium text-krikkit-fg">
                    Files
                </p>
                <span className="shrink-0 text-[11px] tabular-nums text-krikkit-subtle">
                    {loading ? '…' : `${itemCount}${compact ? '' : ' items'}`}
                </span>
            </div>

            <div className={[
                'krikkit-scroll-hover min-h-0 flex-1 overflow-y-auto py-2',
                compact ? 'px-2' : 'px-3',
            ].join(' ')}
            >
                {error && (
                    <p className="px-3 py-6 text-center text-sm text-krikkit-muted">{error}</p>
                )}

                {! error && ! loading && entries.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-krikkit-muted">{emptyHint}</p>
                )}

                {! error && entries.length > 0 && (
                    <>
                        {! compact && (
                            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] gap-2 px-3 pb-2 text-[10px] font-medium tracking-[0.14em] text-krikkit-subtle uppercase">
                                <span>Name</span>
                                <span>Size</span>
                                <span className="text-right">Modified</span>
                            </div>
                        )}

                        <ul
                            className={[
                                'lab-tree-root flex flex-col',
                                compact ? 'lab-tree-root--compact' : '',
                            ].join(' ')}
                        >
                            {entries.map((node) => (
                                <TreeNode
                                    key={node.id}
                                    node={node}
                                    compact={compact}
                                    activePath={activePath}
                                    openFolders={openFolders}
                                    onToggleFolder={onToggleFolder}
                                    onOpenFile={onOpenFile}
                                />
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    )
}
