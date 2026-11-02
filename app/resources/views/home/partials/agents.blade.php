@php
    $agents = $landing->section('agents');
    $items = is_array($agents['items'] ?? null) ? $agents['items'] : [];
@endphp

<section id="agents" class="border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="relative px-6 pt-20 sm:px-10 md:px-12 md:pt-28">
            <h2 class="max-w-2xl text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg sm:text-5xl">
                {{ $agents['title'] }}
            </h2>
            <p class="mt-5 max-w-xl text-sm leading-relaxed text-krikkit-muted sm:text-base">
                {{ $agents['copy'] }}
            </p>
        </div>
        <div class="relative mt-12 grid gap-px border-t border-krikkit-line bg-krikkit-line sm:grid-cols-2 lg:grid-cols-3">
            @foreach ($items as $agent)
                <article class="bg-krikkit-canvas p-6 sm:p-8">
                    <h3 class="text-base font-semibold text-krikkit-fg">{{ $agent['title'] }}</h3>
                    <p class="mt-3 text-sm leading-relaxed text-krikkit-muted">{{ $agent['copy'] }}</p>
                </article>
            @endforeach
        </div>
    </div>
</section>
