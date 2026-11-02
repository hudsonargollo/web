@props([
    'paginator' => null,
    'current' => null,
    'last' => null,
    'total' => null,
    'firstItem' => null,
    'lastItem' => null,
    'goto' => null,
])

@php
    use App\Support\Ui\PaginationPages;
    use Illuminate\Contracts\Pagination\LengthAwarePaginator;
    use Illuminate\Contracts\Pagination\Paginator as PaginatorContract;

    $pager = $paginator instanceof PaginatorContract ? $paginator : null;

    if ($pager instanceof LengthAwarePaginator) {
        $current = $pager->currentPage();
        $last = $pager->lastPage();
        $total = $pager->total();
        $firstItem = $pager->firstItem();
        $lastItem = $pager->lastItem();
    }

    $current = max(1, (int) ($current ?? 1));
    $last = max(1, (int) ($last ?? 1));
    $pages = PaginationPages::numbers($current, $last);
    $hasRange = $total !== null && (int) $total > 0;
    $onFirst = $current <= 1;
    $onLast = $current >= $last;
    $live = is_string($goto) && $goto !== '';
@endphp

@if ($pager || $last > 1 || $hasRange)
    <div {{ $attributes->class('flex flex-wrap items-center justify-between gap-2') }}>
        <p class="text-xs text-krikkit-muted">
            @if ($hasRange)
                <span class="font-medium text-krikkit-fg-soft">{{ $firstItem }}–{{ $lastItem }}</span>
                / {{ $total }}
            @elseif ($pager instanceof LengthAwarePaginator && $pager->total() === 0)
                {{ __('dashboard.No results.') }}
            @endif
        </p>

        @if ($last > 1)
            <nav class="inline-flex items-center gap-0.5" aria-label="{{ __('messages.Pagination') }}">
                @if ($live)
                    <button
                        type="button"
                        wire:click="{{ $goto }}({{ $current - 1 }})"
                        @class([
                            'inline-flex size-6 items-center justify-center rounded text-krikkit-muted transition',
                            $onFirst ? 'pointer-events-none opacity-35' : 'hover:bg-krikkit-soft',
                        ])
                        @if ($onFirst) disabled aria-disabled="true" @endif
                        aria-label="{{ __('messages.Previous') }}"
                    >
                        <krikkit:icon name="chevron-left" class="size-3.5" />
                    </button>
                @else
                    <a
                        href="{{ $onFirst ? '#' : ($pager?->previousPageUrl() ?: $pager?->url($current - 1) ?: '#') }}"
                        @class([
                            'inline-flex size-6 items-center justify-center rounded text-krikkit-muted transition',
                            $onFirst ? 'pointer-events-none opacity-35' : 'hover:bg-krikkit-soft',
                        ])
                        @if ($onFirst) aria-disabled="true" tabindex="-1" @endif
                        aria-label="{{ __('messages.Previous') }}"
                    >
                        <krikkit:icon name="chevron-left" class="size-3.5" />
                    </a>
                @endif

                @foreach ($pages as $page)
                    @if ($page === null)
                        <span class="px-0.5 text-xs text-krikkit-subtle">…</span>
                    @elseif ($live)
                        <button
                            type="button"
                            wire:click="{{ $goto }}({{ $page }})"
                            @class([
                                'inline-flex size-6 items-center justify-center rounded text-xs font-medium transition',
                                $page === $current
                                    ? 'bg-krikkit-fill text-krikkit-on-fill'
                                    : 'text-krikkit-muted hover:bg-krikkit-soft',
                            ])
                            @if ($page === $current) aria-current="page" @endif
                        >{{ $page }}</button>
                    @else
                        <a
                            href="{{ $pager?->url($page) ?: '#' }}"
                            @class([
                                'inline-flex size-6 items-center justify-center rounded text-xs font-medium transition',
                                $page === $current
                                    ? 'bg-krikkit-fill text-krikkit-on-fill'
                                    : 'text-krikkit-muted hover:bg-krikkit-soft',
                            ])
                            @if ($page === $current) aria-current="page" @endif
                        >{{ $page }}</a>
                    @endif
                @endforeach

                @if ($live)
                    <button
                        type="button"
                        wire:click="{{ $goto }}({{ $current + 1 }})"
                        @class([
                            'inline-flex size-6 items-center justify-center rounded text-krikkit-muted transition',
                            $onLast ? 'pointer-events-none opacity-35' : 'hover:bg-krikkit-soft',
                        ])
                        @if ($onLast) disabled aria-disabled="true" @endif
                        aria-label="{{ __('messages.Next') }}"
                    >
                        <krikkit:icon name="chevron-right" class="size-3.5" />
                    </button>
                @else
                    <a
                        href="{{ $onLast ? '#' : ($pager?->nextPageUrl() ?: $pager?->url($current + 1) ?: '#') }}"
                        @class([
                            'inline-flex size-6 items-center justify-center rounded text-krikkit-muted transition',
                            $onLast ? 'pointer-events-none opacity-35' : 'hover:bg-krikkit-soft',
                        ])
                        @if ($onLast) aria-disabled="true" tabindex="-1" @endif
                        aria-label="{{ __('messages.Next') }}"
                    >
                        <krikkit:icon name="chevron-right" class="size-3.5" />
                    </a>
                @endif
            </nav>
        @endif
    </div>
@else
    <nav {{ $attributes->class('inline-flex items-center gap-0.5') }} aria-label="{{ __('messages.Pagination') }}">
        {{ $slot }}
    </nav>
@endif
