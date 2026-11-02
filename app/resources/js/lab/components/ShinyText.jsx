/**
 * Shine sweep across text (React Bits–style), CSS-only — no motion deps.
 * Used for Lab “Thinking…” while the model is still reasoning.
 */
export function ShinyText({
    text,
    className = '',
    speed = 4.1,
    delay = 0,
    color = 'var(--color-krikkit-muted)',
    shineColor = 'var(--color-krikkit-fg)',
    spread = 75,
    direction = 'left',
    yoyo = false,
    disabled = false,
}) {
    if (disabled) {
        return <span className={className || undefined}>{text}</span>
    }

    const style = {
        '--lab-shiny-color': color,
        '--lab-shiny-shine': shineColor,
        '--lab-shiny-spread': `${spread}deg`,
        '--lab-shiny-speed': `${speed}s`,
        '--lab-shiny-delay': `${delay}s`,
    }

    return (
        <span
            className={[
                'lab-shiny-text',
                direction === 'right' ? 'lab-shiny-text--right' : '',
                yoyo ? 'lab-shiny-text--yoyo' : '',
                className,
            ].filter(Boolean).join(' ')}
            style={style}
        >
            {text}
        </span>
    )
}
