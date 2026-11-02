@props(['href' => null, 'current' => false])

@if ($href && ! $current)
    <a href="{{ $href }}" {{ $attributes->class('inline-flex items-center gap-1 hover:text-krikkit-fg transition') }}>
        {{ $slot }}
        <krikkit:icon name="chevron-right" class="size-3.5 text-krikkit-subtle" />
    </a>
@else
    <span {{ $attributes->class(['inline-flex items-center gap-1', $current ? 'font-medium text-krikkit-fg' : '']) }} @if ($current) aria-current="page" @endif>
        {{ $slot }}
    </span>
@endif
