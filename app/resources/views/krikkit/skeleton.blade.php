@props([
    'animate' => true,
])

<div
    {{ $attributes->class([
        'rounded-md bg-krikkit-soft',
        $animate ? 'animate-pulse' : '',
    ]) }}
    aria-hidden="true"
>
    {{ $slot }}
</div>
