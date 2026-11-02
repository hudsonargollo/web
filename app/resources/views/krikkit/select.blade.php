@props([
    'placeholder' => 'Select…',
    'value' => null,
    'invalid' => false,
    'name' => null,
    'searchable' => false,
    'searchPlaceholder' => null,
    'size' => 'md',
])

@php
    $name = $name ?? $attributes->get('name');
    $initial = $value ?? $attributes->get('value');
    $searchPlaceholder = $searchPlaceholder ?? __('dashboard.Search…');
    $triggerSize = match ($size) {
        'sm' => 'h-9 px-3.5 text-sm leading-5',
        'lg' => 'h-12 px-4 text-base leading-6',
        default => 'h-10 px-4 text-sm leading-5',
    };
@endphp

<div
    x-data="{
        open: false,
        placement: 'bottom',
        value: @js($initial !== null ? (string) $initial : null),
        label: '',
        placeholder: @js($placeholder),
        searchable: @js((bool) $searchable),
        query: '',
        optionLabels: [],
        choose(v, l) {
            this.value = String(v)
            this.label = l
            this.query = ''
            this.open = false
            this.$nextTick(() => this.emit())
        },
        emit() {
            const input = this.$refs.input
            if (! input) return
            input.value = this.value ?? ''
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
        },
        matches(text) {
            if (! this.searchable) return true
            const q = this.query.trim().toLowerCase()
            if (! q) return true
            return String(text).toLowerCase().includes(q)
        },
        noResults() {
            if (! this.searchable || ! this.query.trim()) return false
            return ! this.optionLabels.some((text) => this.matches(text))
        },
        toggle() {
            if (this.open) {
                this.close()
                return
            }
            this.updatePlacement()
            this.open = true
            if (this.searchable) {
                this.$nextTick(() => this.$refs.search?.focus())
            }
        },
        close() {
            this.open = false
            this.query = ''
        },
        updatePlacement() {
            const rect = this.$el.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            const spaceAbove = rect.top
            const panelMax = 280
            this.placement = (spaceBelow < panelMax && spaceAbove > spaceBelow) ? 'top' : 'bottom'
        }
    }"
    x-on:keydown.escape.window="close()"
    x-on:click.outside="close()"
    {{ $attributes->only('class')->class('relative w-full') }}
>
    <button
        type="button"
        x-on:click="toggle()"
        class="flex w-full items-center justify-between gap-2 rounded-full border bg-krikkit-surface text-left outline-none transition
            text-krikkit-fg
            {{ $triggerSize }}
            {{ $invalid ? 'border-red-400/70' : 'border-transparent focus-visible:border-krikkit-muted/40' }}"
        :aria-expanded="open.toString()"
    >
        <span class="min-w-0 flex-1 truncate leading-[inherit]" :class="label ? '' : 'text-krikkit-subtle'" x-text="label || placeholder"></span>
        <span class="shrink-0 text-krikkit-subtle transition" :class="open ? 'rotate-180' : ''">
            <krikkit:icon name="chevron-down" class="size-4" />
        </span>
    </button>

    <input
        x-ref="input"
        type="hidden"
        @if ($name) name="{{ $name }}" @endif
        :value="value ?? ''"
        {{ $attributes->whereStartsWith('wire:') }}
    >

    <div
        x-cloak
        x-show="open"
        x-transition.opacity.duration.100ms
        class="absolute z-50 flex w-full flex-col overflow-hidden rounded-lg bg-krikkit-surface"
        :class="placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'"
        role="listbox"
    >
        @if ($searchable)
            <div class="shrink-0 border-b border-krikkit-line/50 p-1.5" x-on:click.stop>
                <div class="relative">
                    <span class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-krikkit-subtle">
                        <krikkit:icon name="magnifying-glass" class="size-3.5" />
                    </span>
                    <input
                        x-ref="search"
                        type="search"
                        x-model="query"
                        placeholder="{{ $searchPlaceholder }}"
                        autocomplete="off"
                        class="h-8 w-full rounded-md border-0 bg-krikkit-soft pl-8 pr-2.5 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                        x-on:keydown.enter.prevent
                        x-on:keydown.escape.stop="close()"
                    >
                </div>
            </div>
        @endif

        <div class="flex max-h-52 flex-col gap-0.5 overflow-auto p-1.5">
            {{ $slot }}

            @if ($searchable)
                <p
                    x-show="noResults()"
                    x-cloak
                    class="px-2.5 py-2 text-sm text-krikkit-muted"
                >{{ __('dashboard.No results.') }}</p>
            @endif
        </div>
    </div>
</div>
