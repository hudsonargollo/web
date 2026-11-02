@php
    $platform = $landing->section('platform');
    $layers = is_array($platform['layers'] ?? null) ? $platform['layers'] : [];
    $stats = is_array($platform['stats'] ?? null) ? $platform['stats'] : [];
@endphp

<section id="platform" class="border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="relative px-6 pt-20 sm:px-10 md:px-12 md:pt-28">
            <span class="inline-flex items-center gap-2 border border-krikkit-line bg-krikkit-soft px-3 py-1.5">
                <span class="size-1.5 bg-accent"></span>
                <span class="text-[11px] font-semibold uppercase tracking-[0.15em] text-krikkit-fg-soft">{{ $platform['eyebrow'] }}</span>
            </span>
            <h2 class="mt-6 max-w-2xl text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg sm:text-5xl">
                {{ $platform['title'] }}
            </h2>
            <p class="mt-5 max-w-xl text-sm leading-relaxed text-krikkit-muted sm:text-base">
                {{ $platform['copy'] }}
            </p>
        </div>
        <div class="relative mt-12 grid border-t border-krikkit-line lg:grid-cols-2">
            <div class="border-b border-krikkit-line lg:border-b-0 lg:border-r">
                @foreach ($layers as $index => $layer)
                    <div class="border-b border-krikkit-line last:border-b-0">
                        <button
                            type="button"
                            class="flex w-full items-center justify-between gap-4 px-6 py-5 text-left sm:px-8"
                            x-on:click="stack = stack === {{ $index }} ? -1 : {{ $index }}"
                        >
                            <span class="text-sm font-semibold text-krikkit-fg sm:text-base">{{ $layer['title'] }}</span>
                            <krikkit:icon name="chevron-down" class="size-4 shrink-0 text-krikkit-muted transition" x-bind:class="stack === {{ $index }} ? 'rotate-180' : ''" />
                        </button>
                        <div
                            class="krikkit-home-fold"
                            data-open="{{ $index === 0 ? '1' : '0' }}"
                            :data-open="stack === {{ $index }} ? '1' : '0'"
                        >
                            <div class="min-h-0 overflow-hidden">
                                <p class="px-6 pb-5 text-sm leading-relaxed text-krikkit-muted sm:px-8">{{ $layer['copy'] }}</p>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
            <div class="flex flex-col justify-between bg-accent p-8 sm:p-10 lg:p-12">
                <p class="text-2xl font-semibold leading-snug text-accent-foreground sm:text-3xl">
                    {{ $platform['quote'] }}
                </p>
                <div class="mt-10">
                    <p class="text-sm font-semibold text-accent-foreground">{{ $platform['quote_name'] }}</p>
                    <p class="text-sm text-accent-foreground/70">{{ $platform['quote_role'] }}</p>
                </div>
                <div class="mt-10 flex flex-wrap gap-2">
                    @foreach ($stats as $stat)
                        <span class="bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">{{ $stat }}</span>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</section>
