@props([
    'label' => null,
    'value' => null,
])

@php
    $id = $attributes->get('id') ?? 'radio-'.uniqid();
    $checked = $attributes->has('checked') && $attributes->get('checked') !== false;
@endphp

<label
    for="{{ $id }}"
    {{ $attributes->only('class')->merge(['class' => 'group inline-flex cursor-pointer items-start gap-2.5 text-sm text-krikkit-fg']) }}
>
    <span class="relative mt-0.5 inline-flex size-4 shrink-0">
        <input
            id="{{ $id }}"
            type="radio"
            class="peer sr-only"
            @if (! is_null($value)) value="{{ $value }}" @endif
            @checked($checked)
            {{ $attributes->except(['class', 'id', 'checked', 'value']) }}
        >
        <span
            class="absolute inset-0 rounded-full border border-krikkit-line bg-transparent transition
                peer-focus-visible:ring-2 peer-focus-visible:ring-krikkit-fg/20
                peer-checked:border-krikkit-fill"
        ></span>
        <span
            class="pointer-events-none absolute inset-0 m-auto size-1.5 rounded-full bg-krikkit-fill opacity-0 transition peer-checked:opacity-100"
        ></span>
    </span>
    @if ($label || $slot->isNotEmpty())
        <span class="leading-5 text-krikkit-fg">{{ $label ?? $slot }}</span>
    @endif
</label>
