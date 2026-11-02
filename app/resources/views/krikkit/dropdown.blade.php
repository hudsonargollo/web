@props([
    'align' => 'start',
    'position' => 'bottom',
    'width' => 'auto',
])

@php
    $panelAlign = match ($align) {
        'end' => 'right-0',
        'center' => 'left-1/2 -translate-x-1/2',
        default => 'left-0',
    };

    $panelPos = match ($position) {
        'top' => 'bottom-full mb-1.5',
        'left' => 'right-full mr-1.5 top-0',
        'right' => 'left-full ml-1.5 top-0',
        default => 'top-full mt-1.5',
    };

    $panelWidth = $width === 'full' ? 'w-full' : 'min-w-[15rem]';
@endphp

<div
    x-data="{ open: false }"
    @keydown.escape.window="open = false"
    @click.outside="open = false"
    {{ $attributes->class('relative inline-flex') }}
>
    <div @click="open = ! open" class="inline-flex w-full">
        {{ $trigger ?? $slot }}
    </div>

    <div
        x-cloak
        x-show="open"
        @if ($position === 'top')
            x-transition.origin.bottom.left
        @else
            x-transition.origin.top.left
        @endif
        class="absolute z-50 overflow-visible rounded-xl border border-krikkit-line bg-[color-mix(in_oklab,var(--color-krikkit-canvas)_55%,var(--color-krikkit-surface)_45%)] p-1 {{ $panelPos }} {{ $panelAlign }} {{ $panelWidth }}"
        role="menu"
    >
        {{ $menu ?? '' }}
    </div>
</div>
