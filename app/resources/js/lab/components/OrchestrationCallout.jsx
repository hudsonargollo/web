/**
 * Ambient orchestration callouts (compile timeout, rollback, escalate, abort).
 * VFS heal rows render as VfsHealBadge instead.
 */
export function OrchestrationCallout({ items = [] }) {
    const visible = (items || []).filter((item) => item?.kind !== 'vfs-heal')
    if (! visible.length) return null

    return (
        <div className="mt-2 flex flex-col gap-1.5">
            {visible.map((item, index) => {
                const tone = item.tone || 'info'
                const toneClass = tone === 'danger'
                    ? 'border-red-500/40 text-red-600 dark:text-red-300'
                    : tone === 'warning'
                        ? 'border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'border-krikkit-line text-krikkit-muted'

                return (
                    <div
                        key={`${index}:${String(item.text).slice(0, 24)}`}
                        className={[
                            'rounded-lg border bg-krikkit-soft/60 px-3 py-2 text-[12px] leading-relaxed',
                            toneClass,
                        ].join(' ')}
                        role="status"
                    >
                        {item.text}
                    </div>
                )
            })}
        </div>
    )
}
