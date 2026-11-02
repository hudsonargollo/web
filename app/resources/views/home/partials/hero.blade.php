@php
    $hero = $landing->section('hero');
    $guestEntry = $landing->guestEntryHref();
@endphp

<section id="overview" class="relative overflow-hidden border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl border-x border-krikkit-line">
        <div class="flex flex-col items-center px-6 pb-16 pt-28 text-center sm:px-10 sm:pt-32 lg:pt-36">
            <span class="inline-flex items-center gap-2 border border-krikkit-line bg-krikkit-soft px-3 py-1.5">
                <span class="size-1.5 bg-accent"></span>
                <span class="text-[11px] font-semibold uppercase tracking-[0.15em] text-krikkit-fg-soft">{{ $hero['eyebrow'] }}</span>
            </span>
            <h1 class="mt-6 max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight text-krikkit-fg sm:text-5xl lg:text-[3.5rem]">
                {{ $hero['title'] }}
            </h1>
            <p class="mt-5 max-w-xl text-sm leading-relaxed text-krikkit-muted sm:text-base">
                {{ $hero['copy'] }}
            </p>
            <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a href="{{ $landing->href($hero['primary_href'] ?? '', auth()->check() ? route('lab') : $guestEntry) }}" class="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition hover:opacity-90">
                    <krikkit:icon name="lab" class="size-4" />
                    {{ $hero['primary_label'] }}
                </a>
                <a href="{{ $landing->href($hero['secondary_href'] ?? '', route('contact')) }}" class="inline-flex items-center border border-krikkit-line bg-krikkit-soft px-6 py-3 text-sm font-medium text-krikkit-fg transition hover:bg-krikkit-soft">{{ $hero['secondary_label'] }}</a>
            </div>
            <p class="mt-5 text-sm text-krikkit-subtle">{{ $hero['footnote'] }}</p>
        </div>
        @include('home.partials.brands')
    </div>
</section>
