@props([
    'selected' => null,
])

<div
    x-data="{ active: @js($selected) }"
    {{ $attributes->class('w-full') }}
>
    {{ $slot }}
</div>
