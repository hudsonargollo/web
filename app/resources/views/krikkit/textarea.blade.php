@props([
    'rows' => 4,
    'resize' => 'y',
    'invalid' => false,
])

@php
    $resizeClass = match ($resize) {
        'none' => 'resize-none',
        'x' => 'resize-x',
        'both' => 'resize',
        default => 'resize-y',
    };
@endphp

<textarea
    rows="{{ $rows }}"
    {{ $attributes->class([
        'w-full rounded-2xl border bg-krikkit-surface px-4 py-2.5 text-sm outline-none transition',
        'text-krikkit-fg placeholder:text-krikkit-subtle',
        'disabled:cursor-not-allowed disabled:opacity-50',
        $resizeClass,
        $invalid
            ? 'border-red-400/70 focus:border-red-500'
            : 'border-transparent focus:border-krikkit-muted/40',
    ]) }}
>{{ $slot }}</textarea>
