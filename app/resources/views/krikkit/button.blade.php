@props([
    'variant' => 'solid',
    'size' => 'md',
    'type' => 'button',
    'square' => false,
    'loading' => false,
    'href' => null,
    // Full-document pages (Lab, auth, etc.) must opt out — wire:navigate breaks them.
    'navigate' => true,
])

@php
    $sizes = match ($size) {
        'xs' => 'h-8 min-h-8 max-h-8 px-3 text-xs gap-1.5',
        'sm' => 'h-9 min-h-9 max-h-9 px-3.5 text-sm gap-1.5',
        'lg' => 'h-12 min-h-12 max-h-12 px-5 text-base gap-2',
        default => 'h-10 min-h-10 max-h-10 px-4 text-sm gap-2',
    };

    $squares = match ($size) {
        'xs' => 'size-8',
        'sm' => 'size-9',
        'lg' => 'size-12',
        default => 'size-10',
    };

    $variants = match ($variant) {
        'outline' => 'border-krikkit-line bg-transparent text-krikkit-fg hover:bg-krikkit-soft/70',
        'ghost' => 'border-transparent bg-transparent text-krikkit-fg-soft hover:bg-krikkit-soft',
        'danger' => 'border-red-600 bg-red-600 text-krikkit-on-fill hover:border-red-700 hover:bg-red-700',
        'subtle' => 'border-krikkit-soft bg-krikkit-soft text-krikkit-fg',
        // Inverse solid (not theme accent) — rare; prefer default/primary for actions.
        'fill' => 'border-krikkit-fill bg-krikkit-fill text-krikkit-on-fill hover:opacity-90',
        // Default + primary = Settings → Themes accent (red/blue/… + dark flip).
        'primary', 'solid' => 'border-accent bg-accent text-accent-foreground hover:opacity-90',
        default => 'border-accent bg-accent text-accent-foreground hover:opacity-90',
    };

    $classes = [
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid box-border py-0 font-medium leading-none whitespace-nowrap transition outline-none',
        'focus-visible:ring-2 focus-visible:ring-krikkit-fg/15',
        'disabled:pointer-events-none disabled:opacity-50',
        $square ? $squares : $sizes,
        $variants,
    ];
@endphp

@if ($href)
    <a
        href="{{ $href }}"
        @if ($navigate) wire:navigate @endif
        {{ $attributes->class($classes) }}
    >{{ $slot }}</a>
@else
    <button
        type="{{ $type }}"
        {{ $attributes->class($classes) }}
        @disabled($loading)
        @if ($loading) data-loading="true" aria-busy="true" @endif
    >@if ($loading)
            <svg class="size-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
        @endif{{ $slot }}</button>
@endif
