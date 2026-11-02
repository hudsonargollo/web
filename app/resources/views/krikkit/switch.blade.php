@props([
    'label' => null,
    'align' => 'left',
])

@php
    $id = $attributes->get('id') ?? 'switch-'.uniqid();
@endphp

<label
    for="{{ $id }}"
    {{ $attributes->only('class')->class([
        'inline-flex cursor-pointer items-center gap-3 text-sm text-krikkit-fg',
        $align === 'right' ? 'flex-row-reverse' : '',
    ]) }}
>
    <span class="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
            id="{{ $id }}"
            type="checkbox"
            role="switch"
            {{ $attributes->except(['class', 'id'])->class('peer sr-only') }}
        >
        {{-- Off: line track · On: theme accent --}}
        <span
            class="absolute inset-0 rounded-full bg-krikkit-line transition
                peer-checked:bg-accent
                peer-focus-visible:ring-2 peer-focus-visible:ring-krikkit-fg/20
                peer-disabled:opacity-50"
        ></span>
        <span
            class="absolute left-0.5 size-5 rounded-full bg-krikkit-canvas transition
                peer-checked:translate-x-5 peer-checked:bg-accent-foreground"
        ></span>
    </span>
    @if ($label || $slot->isNotEmpty())
        <span class="min-w-0">{{ $label ?? $slot }}</span>
    @endif
</label>
