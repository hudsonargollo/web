@props([
    'name',
])

<div
    x-cloak
    x-show="active === @js($name)"
    role="tabpanel"
    {{ $attributes->class('mt-4') }}
>
    {{ $slot }}
</div>
