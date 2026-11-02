@php
    $section = $section ?? 'overview';
    $nav = $nav ?? [];
@endphp

<nav class="flex flex-wrap gap-1 border-b border-krikkit-line pb-px" aria-label="{{ __('dashboard.Finance') }}">
    @foreach ($nav as $item)
        @php $active = $section === $item['key']; @endphp
        <a
            href="{{ route($item['route']) }}"
            wire:navigate
            @class([
                '-mb-px shrink-0 border-b px-3 py-2 text-sm font-medium transition',
                'border-krikkit-fg text-krikkit-fg' => $active,
                'border-transparent text-krikkit-muted hover:text-krikkit-fg' => ! $active,
            ])
        >
            {{ $item['label'] }}
        </a>
    @endforeach
</nav>
