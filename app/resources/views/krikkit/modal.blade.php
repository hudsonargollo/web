@props([
    'name' => 'dialog',
    'size' => 'md',
])

@php
    $widths = match ($size) {
        'sm' => 'max-w-sm',
        'lg' => 'max-w-2xl',
        'xl' => 'max-w-4xl',
        default => 'max-w-lg',
    };
@endphp

<div
    x-data="{
        open: false,
        name: @js($name),
        payload: null,
        show(detail = null) {
            this.payload = detail && typeof detail === 'object' ? detail : null
            this.open = true
        },
        hide() {
            this.open = false
            this.payload = null
        },
    }"
    x-on:krikkit-modal-open.window="
        const detail = $event.detail
        if (detail === name) show()
        else if (detail && detail.name === name) show(detail)
    "
    x-on:krikkit-modal-close.window="if (! $event.detail || $event.detail === name || $event.detail?.name === name) hide()"
    @keydown.escape.window="if (open) hide()"
    {{ $attributes->class('contents') }}
>
    @isset($trigger)
        <div @click="show()">{{ $trigger }}</div>
    @endisset

    <template x-teleport="body">
        <div
            x-cloak
            x-show="open"
            class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
        >
            <div
                x-show="open"
                x-transition.opacity
                class="absolute inset-0 bg-black/40"
                @click="hide()"
            ></div>

            <div
                x-show="open"
                x-transition
                class="relative z-10 w-full {{ $widths }} rounded-2xl border border-krikkit-line bg-krikkit-surface p-5 text-krikkit-fg"
            >
                {{ $slot }}
            </div>
        </div>
    </template>
</div>
