function IconWrench({ className = 'h-4 w-4' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    )
}

/**
 * Visible stand-in for auto-repair turns (raw SYSTEM prompt stays out of the bubble).
 */
export function AutoRepairCard({
    autoRepair = null,
    pending = false,
}) {
    if (! autoRepair) return null

    const title = 'Automated Error Repair'
    const errorCount = Array.isArray(autoRepair.errors) ? autoRepair.errors.length : 0
    const subtitle = autoRepair.subtitle
        || (autoRepair.errorType === 'BUILD_ERROR'
            ? 'Fixing build failure…'
            : (errorCount > 1
                ? `Fixing ${errorCount} runtime errors…`
                : 'Fixing runtime rendering crash…'))

    const badge = autoRepair.file
        || autoRepair.component
        || (autoRepair.errorType === 'BUILD_ERROR' ? 'Build' : 'Runtime')

    return (
        <div
            className="flex w-full justify-end"
            role="status"
            aria-label={title}
        >
            <div className="lab-crest-enter ml-auto w-fit min-w-0 max-w-[85%] rounded-2xl bg-krikkit-fg/[0.04] px-3.5 py-3 dark:bg-krikkit-on-fill/[0.05]">
                <div className="flex items-start gap-2.5">
                    <div
                        className={[
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                            'bg-krikkit-soft/80 text-krikkit-muted',
                            pending ? 'lab-repair-pulse text-accent-content' : '',
                        ].join(' ')}
                    >
                        <IconWrench className="h-3.5 w-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <p className="text-[13px] font-medium leading-snug text-krikkit-fg">
                                {title}
                            </p>
                            {badge ? (
                                <span
                                    className="truncate font-mono text-[11px] text-krikkit-subtle"
                                    title={badge}
                                >
                                    {badge}
                                </span>
                            ) : null}
                        </div>
                        <p className="mt-1 text-[12px] leading-snug text-krikkit-muted">
                            {subtitle}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
