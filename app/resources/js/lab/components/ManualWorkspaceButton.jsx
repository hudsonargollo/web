import { LabTooltip } from './LabTooltip'

/**
 * Header override — open build workspace without the plan/build mode toggle.
 * Icon-only; the AI BuildGateCard (Skip / Switch) remains the primary path.
 */
export function ManualWorkspaceButton({
    onClick,
    disabled = false,
    visible = true,
}) {
    if (! visible) return null

    return (
        <LabTooltip content="Open workspace">
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-krikkit-subtle transition hover:bg-krikkit-soft hover:text-krikkit-fg disabled:pointer-events-none disabled:opacity-40"
                aria-label="Open workspace (manual override)"
            >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                        d="M4 6.5A1.5 1.5 0 0 1 5.5 5h5.17a1.5 1.5 0 0 1 1.06.44l1.33 1.33c.28.28.66.44 1.06.44H18.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-11z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
        </LabTooltip>
    )
}
