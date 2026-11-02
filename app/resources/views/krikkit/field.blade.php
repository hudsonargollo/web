@props(['label' => null])

<div {{ $attributes->class('space-y-1.5') }}>
    @if ($label)
        <krikkit:field.label>{{ $label }}</krikkit:field.label>
    @endif

    {{ $slot }}

    @isset($description)
        <krikkit:field.description>{{ $description }}</krikkit:field.description>
    @endisset

    @isset($error)
        <krikkit:field.error>{{ $error }}</krikkit:field.error>
    @endisset
</div>
