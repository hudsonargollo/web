@props([
    'href' => null,
    'danger' => false,
])

@php
    $classes = [
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition',
        $danger ? 'text-red-700 hover:bg-red-50' : 'text-krikkit-fg-soft hover:bg-krikkit-soft',
    ];
@endphp

@if ($href)
    <a href="{{ $href }}" role="menuitem" {{ $attributes->class($classes) }}>{{ $slot }}</a>
@else
    <button type="button" role="menuitem" {{ $attributes->class($classes) }}>{{ $slot }}</button>
@endif
