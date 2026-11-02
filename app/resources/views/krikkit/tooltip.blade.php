@props([
    'content' => null,
    'position' => 'top',
])

@php
    $pos = match ($position) {
        'bottom' => 'top-full mt-1.5 left-1/2 -translate-x-1/2',
        'left' => 'right-full mr-1.5 top-1/2 -translate-y-1/2',
        'right' => 'left-full ml-1.5 top-1/2 -translate-y-1/2',
        default => 'bottom-full mb-1.5 left-1/2 -translate-x-1/2',
    };
@endphp

<span
    x-data="{ open: false }"
    @mouseenter="open = true"
    @mouseleave="open = false"
    @focusin="open = true"
    @focusout="open = false"
    {{ $attributes->class('relative inline-flex') }}
>
    {{ $slot }}
    <span
        x-cloak
        x-show="open"
        x-transition.opacity
        role="tooltip"
        class="pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-krikkit-fill px-2 py-1 text-xs text-krikkit-on-fill {{ $pos }}"
    >
        {{ $content ?? ($tip ?? '') }}
    </span>
</span>
