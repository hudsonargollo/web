@props([
    'placeholder' => 'Type a command…',
    'name' => 'command',
    'hotkey' => null,
])

@php
    $hotkey = $hotkey ?? $name === 'command';
@endphp

<div
    x-data="{
        open: false,
        q: '',
        name: @js($name),
        hotkey: @js((bool) $hotkey),
        show() { this.open = true; this.$nextTick(() => this.$refs.input?.focus()) },
        hide() { this.open = false; this.q = '' },
        matches(detail) {
            const named = typeof detail === 'string'
                ? detail
                : (detail && typeof detail === 'object' ? detail.name : null)

            if (! named) return this.hotkey

            return named === this.name
        },
    }"
    x-on:krikkit-command-open.window="if (matches($event.detail)) show()"
    @if ($hotkey)
        x-on:keydown.meta.k.window.prevent="show()"
        x-on:keydown.ctrl.k.window.prevent="show()"
    @endif
    x-on:keydown.escape.window="if (open) hide()"
    x-on:livewire:navigating.window="hide()"
    {{ $attributes->class('contents') }}
>
    <template x-teleport="body">
        <div x-cloak x-show="open" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 sm:items-start sm:pt-[15vh]" @click.self="hide()">
            <div
                x-show="open"
                x-transition
                class="w-full max-w-lg overflow-hidden rounded-2xl border border-krikkit-line bg-krikkit-surface"
                @click.stop
            >
                <div class="flex items-center gap-2 border-b border-krikkit-line px-3">
                    <krikkit:icon name="search" class="size-4 text-krikkit-subtle" />
                    <input
                        x-ref="input"
                        type="text"
                        x-model="q"
                        placeholder="{{ $placeholder }}"
                        class="h-12 w-full bg-transparent text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                    >
                </div>
                <div class="max-h-72 overflow-y-auto p-1" x-show="true">
                    <div class="space-y-0.5" x-bind:data-query="q">
                        {{ $slot }}
                    </div>
                </div>
            </div>
        </div>
    </template>
</div>
