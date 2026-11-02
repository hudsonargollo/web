@props([
    'variant' => 'page',
])

@php
    $variant = in_array($variant, ['page', 'table', 'cards', 'form'], true) ? $variant : 'page';
@endphp

<div {{ $attributes->class('animate-pulse space-y-6') }} aria-hidden="true" role="status">
    <div class="space-y-3">
        <krikkit:skeleton class="h-8 w-48 max-w-full" :animate="false" />
        <krikkit:skeleton class="h-4 w-2/3 max-w-md" :animate="false" />
    </div>

    @if ($variant === 'table')
        <div class="overflow-hidden rounded-xl border border-krikkit-line">
            <div class="grid grid-cols-2 gap-4 border-b border-krikkit-line bg-krikkit-soft/60 px-4 py-3 sm:grid-cols-4">
                <krikkit:skeleton class="h-3 w-16" :animate="false" />
                <krikkit:skeleton class="hidden h-3 w-20 sm:block" :animate="false" />
                <krikkit:skeleton class="hidden h-3 w-14 sm:block" :animate="false" />
                <krikkit:skeleton class="ml-auto h-3 w-10" :animate="false" />
            </div>
            @foreach (range(1, 5) as $row)
                <div class="grid grid-cols-2 gap-4 border-b border-krikkit-line px-4 py-3.5 last:border-b-0 sm:grid-cols-4">
                    <div class="flex items-center gap-2">
                        <krikkit:skeleton class="size-7 shrink-0 rounded-full" :animate="false" />
                        <krikkit:skeleton class="h-3.5 w-24 max-w-full" :animate="false" />
                    </div>
                    <krikkit:skeleton class="hidden h-3.5 w-36 max-w-full sm:block" :animate="false" />
                    <krikkit:skeleton class="hidden h-5 w-20 rounded-full sm:block" :animate="false" />
                    <krikkit:skeleton class="ml-auto size-7 rounded-lg" :animate="false" />
                </div>
            @endforeach
        </div>
    @elseif ($variant === 'cards')
        <div class="grid gap-3 sm:grid-cols-2">
            @foreach (range(1, 4) as $card)
                <div class="space-y-4 rounded-xl border border-krikkit-line bg-krikkit-surface p-4">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0 flex-1 space-y-2">
                            <krikkit:skeleton class="h-5 w-28" :animate="false" />
                            <krikkit:skeleton class="h-3 w-40 max-w-full" :animate="false" />
                        </div>
                        <krikkit:skeleton class="h-5 w-12 rounded-full" :animate="false" />
                    </div>
                    <div class="flex gap-1">
                        <krikkit:skeleton class="h-5 w-16 rounded-full" :animate="false" />
                        <krikkit:skeleton class="h-5 w-14 rounded-full" :animate="false" />
                        <krikkit:skeleton class="h-5 w-10 rounded-full" :animate="false" />
                    </div>
                    <krikkit:skeleton class="h-8 w-20 rounded-lg" :animate="false" />
                </div>
            @endforeach
        </div>
    @elseif ($variant === 'form')
        <div class="max-w-lg space-y-5">
            @foreach (range(1, 4) as $field)
                <div class="space-y-2">
                    <krikkit:skeleton class="h-3.5 w-24" :animate="false" />
                    <krikkit:skeleton class="h-9 w-full rounded-lg" :animate="false" />
                </div>
            @endforeach
            <krikkit:skeleton class="h-9 w-28 rounded-lg" :animate="false" />
        </div>
    @else
        <div class="space-y-3">
            <krikkit:skeleton class="h-4 w-full" :animate="false" />
            <krikkit:skeleton class="h-4 w-11/12" :animate="false" />
            <krikkit:skeleton class="h-4 w-4/5" :animate="false" />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
            <krikkit:skeleton class="h-28 w-full rounded-xl" :animate="false" />
            <krikkit:skeleton class="h-28 w-full rounded-xl" :animate="false" />
        </div>
        <div class="space-y-3 rounded-xl border border-krikkit-line p-4">
            <krikkit:skeleton class="h-4 w-1/3" :animate="false" />
            <krikkit:skeleton class="h-4 w-full" :animate="false" />
            <krikkit:skeleton class="h-4 w-5/6" :animate="false" />
            <krikkit:skeleton class="h-24 w-full rounded-lg" :animate="false" />
        </div>
    @endif

    <span class="sr-only">{{ __('dashboard.Loading…') }}</span>
</div>
