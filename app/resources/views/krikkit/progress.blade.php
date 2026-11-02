@props([
    'value' => 0,
    'max' => 100,
    'size' => 'md',
])

@php
    $pct = $max > 0 ? min(100, max(0, ($value / $max) * 100)) : 0;
    $heights = match ($size) {
        'sm' => 'h-1.5',
        'lg' => 'h-3',
        default => 'h-2',
    };
@endphp

<div
    {{ $attributes->class(['w-full overflow-hidden rounded-full bg-krikkit-soft', $heights]) }}
    role="progressbar"
    aria-valuenow="{{ $value }}"
    aria-valuemin="0"
    aria-valuemax="{{ $max }}"
>
    <div class="h-full rounded-full bg-accent transition-all" style="width: {{ $pct }}%"></div>
</div>
