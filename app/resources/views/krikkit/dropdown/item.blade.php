@props([
    'href' => null,
    'icon' => null,
    'danger' => false,
    'type' => 'button',
])

@php
    $classes = [
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition',
        $danger
            ? 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40'
            : 'text-krikkit-fg-soft hover:bg-krikkit-soft hover:text-krikkit-fg',
    ];
@endphp

@if ($href)
    <a href="{{ $href }}" role="menuitem" {{ $attributes->class($classes) }}>
        @if ($icon)<krikkit:icon :name="$icon" class="size-3.5 shrink-0" />@endif
        <span>{{ $slot }}</span>
    </a>
@else
    <button type="{{ $type }}" role="menuitem" {{ $attributes->class($classes) }}>
        @if ($icon)<krikkit:icon :name="$icon" class="size-3.5 shrink-0" />@endif
        <span>{{ $slot }}</span>
    </button>
@endif
