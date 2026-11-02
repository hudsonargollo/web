import { LAB_BTN_OUTLINE } from '../lib/labConstants'

/**
 * Ephemeral suggested-reply chips under a discovery assistant message.
 * Clicking a chip sends that text immediately via the composer pipeline.
 */
export function SuggestionChips({ items = [], onPick, disabled = false }) {
    const chips = Array.isArray(items) ? items.filter(Boolean) : []
    if (! chips.length) return null

    return (
        <div
            className="flex flex-wrap gap-2 pt-0.5"
            role="group"
            aria-label="Suggested replies"
        >
            {chips.map((label) => (
                <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick?.(label)}
                    className={`rounded-full px-3.5 py-1.5 text-left text-xs font-medium ${LAB_BTN_OUTLINE}`}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}
