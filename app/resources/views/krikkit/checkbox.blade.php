@props([
    'label' => null,
])

@php
    $id = $attributes->get('id') ?? 'checkbox-'.uniqid();
    $checked = $attributes->has('checked') && $attributes->get('checked') !== false;
@endphp

<label
    for="{{ $id }}"
    {{ $attributes->only('class')->merge(['class' => 'group inline-flex cursor-pointer items-start gap-2.5 text-sm text-krikkit-fg']) }}
>
    <span class="relative mt-0.5 inline-flex size-4 shrink-0">
        <input
            id="{{ $id }}"
            type="checkbox"
            class="peer sr-only"
            @checked($checked)
            {{ $attributes->except(['class', 'id', 'checked']) }}
        >
        <span
            class="absolute inset-0 rounded-[5px] border border-krikkit-line bg-transparent transition
                peer-focus-visible:ring-2 peer-focus-visible:ring-krikkit-fg/20
                peer-checked:border-krikkit-fill peer-checked:bg-krikkit-fill"
        ></span>
        <svg
            class="pointer-events-none absolute inset-0 m-auto size-3 text-krikkit-on-fill opacity-0 transition peer-checked:opacity-100"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
        >
            <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    </span>
    @if ($label || $slot->isNotEmpty())
        <span class="leading-5">{{ $label ?? $slot }}</span>
    @endif
</label>
