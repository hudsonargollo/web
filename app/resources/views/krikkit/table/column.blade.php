@props(['align' => 'left'])

@php
    $alignClass = match ($align) {
        'center' => 'text-center',
        'right' => 'text-right',
        default => 'text-left',
    };
@endphp

<th scope="col" {{ $attributes->class(['px-3 py-3 sm:px-5', $alignClass]) }}>
    {{ $slot }}
</th>
