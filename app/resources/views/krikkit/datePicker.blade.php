@props([
    'value' => null,
    'placeholder' => 'Pick a date',
    'name' => null,
    'invalid' => false,
])

@php
    $name = $name ?? $attributes->get('name');
    $initial = $value ?? $attributes->get('value');
@endphp

<div
    x-data="krikkitDateDesk({ value: @js($initial) })"
    @keydown.escape.window="open = false"
    @click.outside="open = false"
    {{ $attributes->only('class')->class('relative w-full') }}
>
    <button
        type="button"
        @click="open = ! open; pane = 'days'"
        class="flex h-10 w-full items-center justify-between gap-2 rounded-full border bg-krikkit-surface px-4 text-left text-sm outline-none transition
            focus-visible:border-krikkit-muted
            {{ $invalid ? 'border-red-400/70' : 'border-krikkit-line focus-visible:border-krikkit-muted/40' }}"
    >
        <span :class="value ? 'text-krikkit-fg' : 'text-krikkit-subtle'" x-text="value ? format(value) : @js($placeholder)"></span>
        <krikkit:icon name="calendar" class="size-4 shrink-0 text-krikkit-subtle" />
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
        class="absolute z-40 mt-1.5 w-[18.5rem] rounded-lg border border-krikkit-line bg-krikkit-surface p-3"
    >
        <div class="mb-2 flex items-center justify-between gap-1">
            <button type="button" class="rounded-lg p-1.5 text-krikkit-muted hover:bg-krikkit-soft hover:text-krikkit-fg" @click="prev()" aria-label="{{ __('messages.Previous month') }}">
                <krikkit:icon name="chevron-left" class="size-4" />
            </button>
            <div class="flex min-w-0 items-center gap-0.5">
                <button
                    type="button"
                    class="rounded-lg px-1.5 py-1 text-sm font-semibold hover:bg-krikkit-soft"
                    :class="pane === 'days' ? 'bg-krikkit-soft text-krikkit-fg' : 'text-krikkit-muted'"
                    @click="show('days')"
                >
                    <span x-text="dayStamp()"></span>
                </button>
                <button
                    type="button"
                    class="rounded-lg px-1.5 py-1 text-sm font-semibold hover:bg-krikkit-soft"
                    :class="pane === 'months' ? 'bg-krikkit-soft text-krikkit-fg' : 'text-krikkit-muted'"
                    @click="show('months')"
                >
                    <span x-text="monthStamp()"></span>
                </button>
                <button
                    type="button"
                    class="rounded-lg px-1.5 py-1 text-sm font-semibold hover:bg-krikkit-soft"
                    :class="pane === 'years' ? 'bg-krikkit-soft text-krikkit-fg' : 'text-krikkit-muted'"
                    @click="show('years')"
                >
                    <span x-text="cursor.y"></span>
                </button>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-krikkit-muted hover:bg-krikkit-soft hover:text-krikkit-fg" @click="next()" aria-label="{{ __('messages.Next month') }}">
                <krikkit:icon name="chevron-right" class="size-4" />
            </button>
        </div>

        <div x-show="pane === 'days'">
            <div class="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-krikkit-muted">
                <template x-for="d in weekdays" :key="d"><span class="py-1" x-text="d"></span></template>
            </div>
            <div class="grid grid-cols-7 gap-1">
                <template x-for="day in days()" :key="day.iso">
                    <button
                        type="button"
                        class="aspect-square rounded-lg text-sm transition"
                        :class="{
                            'bg-krikkit-fill text-krikkit-on-fill': value === day.iso,
                            'text-krikkit-subtle': ! day.inMonth && value !== day.iso,
                            'text-krikkit-fg hover:bg-krikkit-soft': day.inMonth && value !== day.iso,
                        }"
                        @click="pick(day.iso)"
                        x-text="day.day"
                    ></button>
                </template>
            </div>
        </div>

        <div x-show="pane === 'months'" class="grid grid-cols-3 gap-1">
            <template x-for="month in months()" :key="month.m">
                <button
                    type="button"
                    class="rounded-lg px-2 py-2 text-sm font-medium hover:bg-krikkit-soft"
                    :class="cursor.m === month.m ? 'bg-krikkit-soft text-krikkit-fg' : 'text-krikkit-muted'"
                    @click="pickMonth(month.m)"
                    x-text="month.label"
                ></button>
            </template>
        </div>

        <div x-show="pane === 'years'" class="grid grid-cols-3 gap-1">
            <template x-for="year in years()" :key="year">
                <button
                    type="button"
                    class="rounded-lg px-2 py-2 text-sm font-medium hover:bg-krikkit-soft"
                    :class="cursor.y === year ? 'bg-krikkit-soft text-krikkit-fg' : 'text-krikkit-muted'"
                    @click="pickYear(year)"
                    x-text="year"
                ></button>
            </template>
        </div>
    </div>
</div>
