import { ShinyText } from './ShinyText'

/**
 * Shared Lab tool label — shimmers while pending, plain once the result lands.
 * Do not put overflow/truncate on the shiny node (clips background-clip:text to nothing).
 */
export function ToolStatusText({
    text,
    pending = false,
    className = '',
}) {
    return (
        <ShinyText
            text={text}
            disabled={! pending}
            className={className || undefined}
            speed={1.5}
            delay={0}
            color="var(--color-krikkit-muted)"
            shineColor="var(--color-krikkit-fg-soft)"
            spread={75}
            direction="left"
            yoyo={false}
        />
    )
}
