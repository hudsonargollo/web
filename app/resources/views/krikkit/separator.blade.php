@props([
    'orientation' => 'horizontal',
])

@php
    $classes = $orientation === 'vertical'
        ? 'w-px self-stretch bg-krikkit-line'
        : 'h-px w-full bg-krikkit-line';
@endphp

<div role="separator" {{ $attributes->class($classes) }}></div>
