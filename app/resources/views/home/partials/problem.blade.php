@php
    $problem = $landing->section('problem');
@endphp

<section id="about" class="border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="relative px-6 py-20 sm:px-10 md:py-28 lg:px-16">
            <h2 class="mx-auto max-w-4xl text-center text-2xl font-medium leading-snug tracking-tight text-krikkit-fg sm:text-3xl lg:text-4xl">
                {{ $problem['title'] }}
            </h2>
            <p class="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-krikkit-muted sm:text-base">
                {{ $problem['copy'] }}
            </p>
        </div>
    </div>
</section>
