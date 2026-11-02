<section class="border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
        <div class="relative px-6 pt-20 text-center md:px-12 md:pt-28">
            @include('home.partials.badge', ['label' => __('home.By the numbers')])
            <h2 class="mx-auto mt-6 max-w-2xl text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg md:text-5xl">
                {{ __('home.Built around the Lab desk, not a pile of tabs.') }}
            </h2>
        </div>
        <div class="relative mt-12 grid gap-px border-t border-krikkit-line bg-krikkit-line sm:grid-cols-2 lg:grid-cols-4">
            @foreach ([
                ['value' => __('home.One desk'), 'hint' => __('home.Brief, files, and canvas')],
                ['value' => __('home.Real files'), 'hint' => __('home.Markup you can open')],
                ['value' => __('home.Pack credits'), 'hint' => __('home.Spend only on generation')],
                ['value' => __('home.Your domain'), 'hint' => __('home.When a pack unlocks it')],
            ] as $stat)
                <article class="bg-krikkit-canvas px-6 py-12 text-center md:px-8">
                    <p class="text-3xl font-medium tracking-tight text-krikkit-fg md:text-4xl">{{ $stat['value'] }}</p>
                    <p class="mt-2 text-sm text-krikkit-muted">{{ $stat['hint'] }}</p>
                </article>
            @endforeach
        </div>
    </div>
</section>
