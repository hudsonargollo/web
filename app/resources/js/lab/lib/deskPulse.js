/**
 * Lab toast host. Settings/Studio use Alpine <krikkit:toast />; Lab does not load Alpine.
 */

function host() {
    let root = document.getElementById('krikkit-lab-toasts')
    if (root) {
        return root
    }

    root = document.createElement('div')
    root.id = 'krikkit-lab-toasts'
    root.className = 'pointer-events-none fixed bottom-4 right-4 z-[80] flex max-w-md flex-col items-end gap-2'
    root.setAttribute('aria-live', 'polite')
    document.body.appendChild(root)

    return root
}

function toneOf(tone) {
    if (tone === 'ok' || tone === 'success') return 'ok'
    if (tone === 'fail' || tone === 'danger') return 'fail'
    if (tone === 'warn' || tone === 'warning') return 'warn'
    return 'note'
}

export function emitDeskPulse(raw) {
    const packet = Array.isArray(raw) ? raw[0] : raw
    if (! packet || typeof packet !== 'object') {
        return
    }

    const copy = packet.copy ?? packet.body ?? packet.message ?? packet.text ?? null
    if (! copy) {
        return
    }

    window.dispatchEvent(new CustomEvent('krikkit-pulse', {
        detail: {
            uid: packet.uid || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            copy,
            eyebrow: packet.eyebrow ?? packet.title ?? null,
            tone: packet.tone ?? 'note',
            linger: Number(packet.linger ?? 4500),
        },
    }))
}

export function failDeskPulse(copy) {
    emitDeskPulse({ copy, tone: 'fail' })
}

function paint(packet) {
    const copy = packet.copy ?? packet.message ?? null
    if (! copy) {
        return
    }

    const uid = packet.uid || `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const linger = Number(packet.linger ?? 4500)
    const tone = toneOf(packet.tone)
    const color = tone === 'ok'
        ? 'text-emerald-600 dark:text-emerald-400'
        : tone === 'fail'
            ? 'text-red-600 dark:text-red-400'
            : tone === 'warn'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-accent-content'

    const row = document.createElement('div')
    row.dataset.uid = uid
    row.className = 'pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-krikkit-line bg-krikkit-surface p-3'
    row.setAttribute('role', 'status')
    row.innerHTML = `
        <span class="flex size-5 shrink-0 items-center justify-center ${color}">
            <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                ${tone === 'ok'
                    ? '<path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />'
                    : '<path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />'}
            </svg>
        </span>
        <p class="min-w-0 flex-1 break-words text-xs font-normal leading-snug text-krikkit-fg-soft"></p>
    `
    row.querySelector('p').textContent = String(copy)
    host().appendChild(row)

    if (linger > 0) {
        window.setTimeout(() => row.remove(), linger)
    }
}

export function bootDeskPulse(seed) {
    window.addEventListener('krikkit-pulse', (event) => paint(event.detail))
    if (seed) {
        paint(seed)
    }
}
