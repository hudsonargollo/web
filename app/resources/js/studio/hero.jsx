import { createRoot } from 'react-dom/client'
import { SeedChips } from '../lab/components/EmptyLabHero'

let mounted = null

function onPickSeed(prompt) {
    window.dispatchEvent(new CustomEvent('studio-seed-prompt', {
        detail: { prompt: String(prompt || ''), send: true },
    }))
}

/**
 * Same Lab seed chips (random 4 + refresh + customize) on Studio home.
 */
export function bootStudioHero() {
    const el = document.getElementById('studio-seed-chips')
    if (mounted?.el === el) return

    mounted?.root?.unmount()
    mounted = null

    if (! el) return

    const root = createRoot(el)
    root.render(
        <SeedChips live={false} padded={false} onPickSeed={onPickSeed} />,
    )
    mounted = { el, root }
}
