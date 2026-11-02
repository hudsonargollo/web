@props([
    'title' => null,
    'copy' => null,
    'icon' => 'empty',
])

<div
    {{ $attributes->class('flex flex-col items-center justify-center px-6 py-16 text-center') }}
    role="status"
>
    @if ($icon)
        <krikkit:icon :name="$icon" class="size-24 text-krikkit-subtle" />
    @endif
    @if (filled($title))
        <p @class(['text-base font-medium tracking-tight text-krikkit-fg', 'mt-5' => (bool) $icon])>{{ $title }}</p>
    @endif
    @if (filled($copy))
        <p class="mt-1.5 max-w-sm text-sm text-krikkit-muted">{{ $copy }}</p>
    @endif
    @if (! $slot->isEmpty())
        <div class="mt-6">{{ $slot }}</div>
    @endif
</div>
