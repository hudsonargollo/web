@props([
    'min' => 0,
    'max' => 100,
    'step' => 1,
    'value' => null,
])

@php
    $minN = (float) $min;
    $maxN = (float) $max;
    $current = $value !== null && $value !== '' ? (float) $value : $minN;
    $span = $maxN - $minN;
    $fill = $span > 0 ? (($current - $minN) / $span) * 100 : 0;
@endphp

<input
    type="range"
    min="{{ $min }}"
    max="{{ $max }}"
    step="{{ $step }}"
    @if ($value !== null) value="{{ $value }}" @endif
    style="--krikkit-slider-fill: {{ $fill }}%"
    oninput="this.style.setProperty('--krikkit-slider-fill', ((Number(this.value)-Number(this.min))/(Number(this.max)-Number(this.min)||1)*100)+'%')"
    {{ $attributes->class([
        'krikkit-slider h-5 w-full cursor-pointer appearance-none bg-transparent accent-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krikkit-fg/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
    ]) }}
>
