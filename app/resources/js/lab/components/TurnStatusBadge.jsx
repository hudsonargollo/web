/**
 * Soft turn status badge — action language, not mode names.
 */
export function TurnStatusBadge({ label = '', visible = false }) {
    if (! visible || ! label) return null

    return (
        <p
            className="mt-1 text-[11px] font-medium tracking-wide text-krikkit-subtle"
            aria-live="polite"
        >
            {label}
        </p>
    )
}
