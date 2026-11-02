@props(['position' => 'bottom-right'])

@php
    $pos = match ($position) {
        'bottom-left' => 'left-0 bottom-full mb-1',
        'top-right' => 'right-0 top-full mt-1',
        'top-left' => 'left-0 top-full mt-1',
        default => 'right-0 bottom-full mb-1',
    };
@endphp

<div
    x-data="{ open: false }"
    @contextmenu.prevent="open = true"
    @keydown.escape.window="open = false"
    @click.outside="open = false"
    {{ $attributes->class('relative inline-flex') }}
>
    {{ $slot }}

    <div
        x-cloak
        x-show="open"
        @click="open = false"
        class="absolute z-50 min-w-40 overflow-hidden rounded-xl bg-krikkit-surface p-1 {{ $pos }}"
        role="menu"
    >
        {{ $menu ?? '' }}
    </div>
</div>
