@props([
    'value' => null,
    'placeholder' => 'Pick a time',
    'name' => null,
    'step' => 15,
    'invalid' => false,
])

@php
    $name = $name ?? $attributes->get('name');
    $initial = $value ?? $attributes->get('value');
    $step = max(1, (int) $step);
@endphp

<div
    x-data="{
        open: false,
        value: @js($initial),
        hour: @js($initial) ? Number(String(@js($initial)).split(':')[0]) : 9,
        minute: @js($initial) ? Number(String(@js($initial)).split(':')[1]) : 0,
        step: @js($step),
        hours: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
        minutes() {
            const out = []
            for (let m = 0; m < 60; m += this.step) out.push(String(m).padStart(2, '0'))
            return out
        },
        display() {
            if (! this.value) return ''
            return this.value.slice(0, 5)
        },
        sync() {
            this.value = String(this.hour).padStart(2, '0') + ':' + String(this.minute).padStart(2, '0')
            this.$nextTick(() => {
                this.$refs.input?.dispatchEvent(new Event('input', { bubbles: true }))
                this.$refs.input?.dispatchEvent(new Event('change', { bubbles: true }))
            })
        },
        setHour(h) { this.hour = Number(h); this.sync() },
        setMinute(m) { this.minute = Number(m); this.sync() },
    }"
    @keydown.escape.window="open = false"
    @click.outside="open = false"
    {{ $attributes->only('class')->class('relative w-full') }}
>
    <button
        type="button"
        @click="open = ! open"
        class="flex h-10 w-full items-center justify-between gap-2 rounded-full border bg-krikkit-surface px-4 text-left text-sm outline-none transition
            focus-visible:border-krikkit-muted
            {{ $invalid ? 'border-red-400/70' : 'border-transparent focus-visible:border-krikkit-muted/40' }}"
    >
        <span :class="value ? 'text-krikkit-fg' : 'text-krikkit-subtle'" x-text="value ? display() : @js($placeholder)"></span>
        <krikkit:icon name="clock" class="size-4 shrink-0 text-krikkit-subtle" />
    </button>

    <input
        x-ref="input"
        type="hidden"
        @if ($name) name="{{ $name }}" @endif
        x-model="value"
        {{ $attributes->whereStartsWith('wire:') }}
    >

    <div
        x-cloak
        x-show="open"
        x-transition.origin.top
        class="absolute z-40 mt-1.5 w-56 overflow-hidden rounded-lg bg-krikkit-surface"
    >
        <div class="grid grid-cols-2 divide-x divide-krikkit-line">
            <div class="krikkit-scroll-hover max-h-48 overflow-y-auto p-1">
                <p class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-krikkit-subtle">Hour</p>
                <template x-for="h in hours" :key="'h'+h">
                    <button
                        type="button"
                        class="flex w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition"
                        :class="String(hour).padStart(2,'0') === h ? 'bg-krikkit-fill text-krikkit-on-fill' : 'text-krikkit-fg-soft hover:bg-krikkit-soft'"
                        @click="setHour(h)"
                        x-text="h"
                    ></button>
                </template>
            </div>
            <div class="krikkit-scroll-hover max-h-48 overflow-y-auto p-1">
                <p class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-krikkit-subtle">Min</p>
                <template x-for="m in minutes()" :key="'m'+m">
                    <button
                        type="button"
                        class="flex w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition"
                        :class="String(minute).padStart(2,'0') === m ? 'bg-krikkit-fill text-krikkit-on-fill' : 'text-krikkit-fg-soft hover:bg-krikkit-soft'"
                        @click="setMinute(m)"
                        x-text="m"
                    ></button>
                </template>
            </div>
        </div>
        <div class="border-t border-krikkit-line p-2">
            <button type="button" class="w-full rounded-lg bg-krikkit-soft px-3 py-1.5 text-sm font-medium text-krikkit-fg hover:bg-krikkit-soft" @click="open = false">Done</button>
        </div>
    </div>
</div>
