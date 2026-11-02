@props(['align' => 'left'])

@php
    $alignClass = match ($align) {
        'center' => 'text-center',
        'right' => 'text-right',
        default => 'text-left',
    };
@endphp

<td {{ $attributes->class(['px-3 py-3 align-middle sm:px-5 sm:py-3.5', $alignClass]) }}>
    {{ $slot }}
</td>
