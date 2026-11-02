@props([
    'name' => null,
    'src' => null,
    'initials' => null,
    'size' => 'md',
    'circle' => true,
])

@php
    $sizes = match ($size) {
        'xs' => 'size-7 text-[11px]',
        'sm' => 'size-9 text-xs',
        'lg' => 'size-14 text-base',
        'xl' => 'size-20 text-xl',
        default => 'size-11 text-sm',
    };

    $shape = $circle ? 'rounded-full' : 'rounded-lg';
    $label = $initials ?? (is_string($name) ? collect(preg_split('/\s+/', trim($name)))->take(2)->map(fn ($p) => mb_strtoupper(mb_substr($p, 0, 1)))->implode('') : '');
@endphp

<span
    {{ $attributes->class([
        'inline-flex items-center justify-center overflow-hidden bg-krikkit-soft font-semibold text-krikkit-fg-soft',
        $sizes,
        $shape,
    ]) }}
    @if ($name) title="{{ $name }}" @endif
>
    @if ($src)
        <img src="{{ $src }}" alt="{{ $name ?? '' }}" class="size-full object-cover">
    @elseif ($slot->isNotEmpty())
        {{ $slot }}
    @else
        {{ $label ?: '?' }}
    @endif
</span>
