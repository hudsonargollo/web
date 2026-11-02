<section id="stack" class="scroll-mt-20 border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
        <div class="relative px-6 pt-20 md:px-12 md:pt-28">
            @include('home.partials.badge', ['label' => __('home.Stack')])
            <h2 class="mt-6 max-w-2xl text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg md:text-5xl">
                {{ __('home.Connect the desk to what you already run') }}
            </h2>
            <p class="mt-5 max-w-xl text-sm leading-relaxed text-krikkit-muted sm:text-base">
                {{ __('home.GitHub import, domains, credits, and preview sit on the same workspace — not a pile of extra products.') }}
            </p>
        </div>
        <div class="relative mt-12 grid grid-cols-2 gap-px border-t border-krikkit-line bg-krikkit-line sm:grid-cols-4">
            @foreach ([
                ['icon' => 'document-text', 'label' => __('messages.Brief')],
                ['icon' => 'folder', 'label' => __('messages.Files')],
                ['icon' => 'eye', 'label' => __('messages.Preview')],
                ['icon' => 'code-bracket', 'label' => __('home.GitHub')],
                ['icon' => 'globe-alt', 'label' => __('home.Domain')],
                ['icon' => 'sparkles', 'label' => __('home.Credits')],
                ['icon' => 'rectangle-stack', 'label' => __('home.Packs')],
                ['icon' => 'user-group', 'label' => __('home.Roles')],
            ] as $tile)
                <div class="flex flex-col items-center gap-3 bg-krikkit-canvas px-4 py-10">
                    <span class="inline-flex size-12 items-center justify-center border border-krikkit-line bg-krikkit-surface text-krikkit-fg">
                        <krikkit:icon :name="$tile['icon']" class="size-5" />
                    </span>
                    <p class="text-sm font-medium text-krikkit-fg">{{ $tile['label'] }}</p>
                </div>
            @endforeach
        </div>
    </div>
</section>
