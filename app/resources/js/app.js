import { bootAsciiHexdump } from './home/asciiHexdump'
import { registerKrikkitDate } from './krikkit-date'
import { registerKrikkitInk } from './krikkit-ink'
import { applyKrikkitTheme, readKrikkitTheme } from './krikkit-theme'
import { registerStudioComposer } from './studio/composer'

let studioHero = null

function bootStudioHero() {
    const el = document.getElementById('studio-seed-chips')
    if (! el) {
        studioHero?.bootStudioHero()
        return
    }

    import('./studio/hero.jsx').then((mod) => {
        studioHero = mod
        mod.bootStudioHero()
    })
}

applyKrikkitTheme()
document.addEventListener('livewire:navigated', () => applyKrikkitTheme())
document.addEventListener('DOMContentLoaded', () => bootAsciiHexdump())
document.addEventListener('livewire:navigated', () => bootAsciiHexdump())
document.addEventListener('DOMContentLoaded', () => bootStudioHero())
document.addEventListener('livewire:navigated', () => bootStudioHero())

window.krikkitTheme = {
    apply: applyKrikkitTheme,
    read: readKrikkitTheme,
}

function destinationUrl(detail) {
    const raw = detail?.url
    if (raw instanceof URL) return raw
    try {
        return new URL(String(raw || ''), window.location.origin)
    } catch {
        return null
    }
}

function isLabPath(pathname) {
    return pathname === '/lab' || pathname.startsWith('/lab/')
}

/**
 * Lab is a full React document. Soft wire:navigate into/out of it (or history
 * restore) leaves the URL updated while the wrong DOM stays on screen.
 *
 * For history (back/forward): the browser has usually already updated
 * location — trust window.location, not Livewire's snapshot URL. Using
 * detail.url here caused /lab/ flashes then jumps to an older project.
 */
document.addEventListener('livewire:navigate', (event) => {
    const detail = event.detail || {}
    const url = destinationUrl(detail)
    if (! url) return

    const fromLab = isLabPath(window.location.pathname)
    const toLab = isLabPath(url.pathname)
    const isHistoryNav = Boolean(detail.history)

    if (toLab || fromLab || isHistoryNav) {
        event.preventDefault()
        if (isHistoryNav) {
            window.location.assign(window.location.href)
            return
        }
        window.location.assign(url.href)
    }
})

document.addEventListener('alpine:init', () => {
    registerKrikkitDate(Alpine)
    registerKrikkitInk(Alpine)
    registerStudioComposer(Alpine)

    Alpine.data('krikkitHomePlatform', () => ({
        active: 0,
        observer: null,

        init() {
            const panels = [...this.$el.querySelectorAll('[data-platform-panel]')]
            if (panels.length === 0) {
                return
            }

            this.observer = new IntersectionObserver((entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

                if (! visible) {
                    return
                }

                const index = Number(visible.target.getAttribute('data-platform-panel'))
                if (Number.isFinite(index)) {
                    this.active = index
                }
            }, {
                root: null,
                rootMargin: '-28% 0px -48% 0px',
                threshold: [0, 0.2, 0.45, 0.7, 1],
            })

            panels.forEach((panel) => this.observer.observe(panel))
        },

        destroy() {
            this.observer?.disconnect()
        },

        go(index) {
            const panel = this.$el.querySelector(`[data-platform-panel="${index}"]`)
            if (! panel) {
                return
            }

            this.active = index
            panel.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'start',
            })
        },
    }))

    Alpine.data('krikkitPageLoad', () => ({
        loading: false,
        minHeight: null,

        init() {
            const release = () => this.stop()
            document.addEventListener('livewire:navigated', release)
            document.addEventListener('livewire:navigate-error', release)
            window.addEventListener('pageshow', release)
            window.addEventListener('popstate', release)
        },

        start() {
            const height = this.$refs.page?.offsetHeight
            this.minHeight = height && height > 0 ? height : null
            this.loading = true
        },

        stop() {
            this.loading = false
            this.minHeight = null
        },
    }))
})
