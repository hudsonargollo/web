export function readDeskPrefs() {
    if (typeof document === 'undefined') {
        return { show_token_usage: false, sound_alerts: true }
    }

    const node = document.getElementById('lab-prefs')
    const raw = node?.textContent?.trim()
    if (! raw || raw === 'null') {
        return { show_token_usage: false, sound_alerts: true }
    }

    try {
        const parsed = JSON.parse(raw)
        return {
            show_token_usage: Boolean(parsed?.show_token_usage),
            sound_alerts: parsed?.sound_alerts !== false,
        }
    } catch {
        return { show_token_usage: false, sound_alerts: true }
    }
}

export function playDeskChime() {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return
    }

    const prefs = readDeskPrefs()
    if (! prefs.sound_alerts) {
        return
    }

    if (typeof document.hidden === 'boolean' && ! document.hidden) {
        return
    }

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (! AudioCtx) {
            return
        }

        const ctx = new AudioCtx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 784
        gain.gain.value = 0.07
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32)
        osc.stop(ctx.currentTime + 0.36)
        osc.onended = () => {
            ctx.close().catch(() => {})
        }
    } catch {
        // Autoplay / AudioContext may be blocked in some browsers.
    }
}
