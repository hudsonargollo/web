@php
    $section = $section ?? 'profile';
    $nav = $nav ?? [];
@endphp

<nav class="-mx-4 flex gap-1 overflow-x-auto border-b border-krikkit-line px-4 pb-px sm:-mx-5 sm:px-5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" aria-label="{{ __('dashboard.Profile') }}">
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
