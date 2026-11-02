@props([
    'label',
    'type' => 'text',
    'name',
    'autocomplete' => null,
    'value' => '',
    'required' => true,
    'size' => 'lg',
])

@php
    $attributes = $attributes->merge(array_filter([
        'type' => $type,
        'name' => $name,
        'id' => $name,
        'value' => old($name, $value),
        'autocomplete' => $autocomplete,
        'required' => $required ? true : null,
    ], fn ($value) => $value !== null && $value !== false));
@endphp

<krikkit:field :label="$label">
    <krikkit:input :size="$size" :invalid="$errors->has($name)" {{ $attributes }} />

    @error($name)
        <krikkit:field.error>{{ $message }}</krikkit:field.error>
    @enderror
</krikkit:field>
