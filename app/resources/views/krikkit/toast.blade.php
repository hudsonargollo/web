@props([
    'anchor' => 'se',
])

@php
    use App\Support\Ui\Pulse;

    $seed = Pulse::pending();

    $anchorClass = match ($anchor) {
        'nw' => 'top-4 left-4 items-start',
        'n' => 'top-4 inset-x-0 items-center',
        'ne' => 'top-4 right-4 items-end',
        'sw' => 'bottom-4 left-4 items-start',
        's' => 'bottom-4 inset-x-0 items-center',
        default => 'bottom-4 right-4 items-end',
    };
@endphp

<div
    {{ $attributes->class(['pointer-events-none fixed z-[80] flex max-w-md flex-col gap-2', $anchorClass]) }}
    aria-live="polite"
    x-data="{
        stack: [],
        boot: @js($seed),
        init() {
            if (this.boot) this.ingest(this.boot)
        },
        ingest(raw) {
            const packet = Array.isArray(raw) ? raw[0] : raw
            if (! packet || typeof packet !== 'object') return

            const copy = packet.copy ?? packet.body ?? packet.message ?? packet.text ?? null
            if (! copy) return

            const uid = packet.uid || packet.id || (Date.now() + '-' + Math.random().toString(16).slice(2))
            const row = {
                uid,
                copy,
                eyebrow: packet.eyebrow ?? packet.title ?? packet.heading ?? null,
                tone: packet.tone ?? packet.variant ?? 'note',
                linger: Number(packet.linger ?? packet.duration ?? 4500),
                open: true,
            }

            this.stack = [...this.stack, row]

            if (row.linger > 0) {
                setTimeout(() => this.retire(uid), row.linger)
            }
        },
        retire(uid) {
            this.stack = this.stack.map((item) =>
                item.uid === uid ? { ...item, open: false } : item
            )

            setTimeout(() => {
                this.stack = this.stack.filter((item) => item.uid !== uid)
            }, 180)
        },
        toneOf(tone) {
            if (tone === 'ok' || tone === 'success') return 'ok'
            if (tone === 'fail' || tone === 'danger') return 'fail'
            if (tone === 'warn' || tone === 'warning') return 'warn'
            return 'note'
        },
    }"
    x-on:krikkit-pulse.window="ingest($event.detail)"
>
    <template x-for="entry in stack" :key="entry.uid">
        <div
            x-show="entry.open"
            x-transition:enter="transition ease-out duration-200"
            x-transition:enter-start="opacity-0 translate-y-1"
            x-transition:enter-end="opacity-100 translate-y-0"
            x-transition:leave="transition ease-in duration-150"
            x-transition:leave-start="opacity-100"
            x-transition:leave-end="opacity-0"
            class="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-krikkit-line bg-krikkit-surface p-3"
            role="status"
        >
            <span
                class="flex size-5 shrink-0 items-center justify-center"
                :class="{
                    'text-emerald-600 dark:text-emerald-400': toneOf(entry.tone) === 'ok',
                    'text-red-600 dark:text-red-400': toneOf(entry.tone) === 'fail',
                    'text-amber-600 dark:text-amber-400': toneOf(entry.tone) === 'warn',
                    'text-accent-content': toneOf(entry.tone) === 'note',
                }"
            >
                <span x-show="toneOf(entry.tone) === 'ok'" class="flex">
                    <krikkit:icon name="check-circle" class="size-5" />
                </span>
                <span x-show="toneOf(entry.tone) === 'fail'" class="flex">
                    <krikkit:icon name="x-circle" class="size-5" />
                </span>
                <span x-show="toneOf(entry.tone) === 'warn'" class="flex">
                    <krikkit:icon name="exclamation-triangle" class="size-5" />
                </span>
                <span x-show="toneOf(entry.tone) === 'note'" class="flex">
                    <krikkit:icon name="information-circle" class="size-5" />
                </span>
            </span>

            <div class="min-w-0 flex-1">
                <p
                    class="text-[11px] font-normal leading-none text-krikkit-muted"
                    x-show="entry.eyebrow"
                    x-text="entry.eyebrow"
                ></p>
                <p
                    class="break-words text-xs font-normal leading-snug text-krikkit-fg-soft"
                    :class="entry.eyebrow ? 'mt-1' : ''"
                    x-text="entry.copy"
                ></p>
            </div>

            <button
                type="button"
                class="flex size-5 shrink-0 items-center justify-center text-krikkit-muted hover:text-krikkit-fg"
                @click="retire(entry.uid)"
                aria-label="{{ __('messages.Dismiss') }}"
            >
                <krikkit:icon name="x" class="size-4" />
            </button>
        </div>
    </template>
</div>
