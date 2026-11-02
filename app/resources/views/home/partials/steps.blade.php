<section id="how" class="scroll-mt-20 border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
        <div class="relative flex flex-col items-center px-6 pt-20 text-center md:px-12 md:pt-28">
            @include('home.partials.badge', ['label' => __('home.How it works')])
            <h2 class="mt-6 max-w-3xl text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg md:text-5xl">
                {{ __('home.From kickoff to a live page in one sitting') }}
            </h2>
            <p class="mt-5 max-w-2xl text-sm leading-relaxed text-krikkit-muted sm:text-base">
                {{ __('home.A short path that keeps the tools you already have — browser, files, domain — in the loop.') }}
            </p>
        </div>
        <div class="relative mt-12 grid gap-px border-t border-krikkit-line bg-krikkit-line lg:grid-cols-3">
            @foreach ([
                ['n' => __('home.Step 01'), 'title' => __('home.Write the brief'), 'copy' => __('home.Say what the site is for. Lab turns that into pages, type, and layout.')],
                ['n' => __('home.Step 02'), 'title' => __('home.Review the canvas'), 'copy' => __('home.Watch the preview update. Open a file when you want a precise change.')],
                ['n' => __('home.Step 03'), 'title' => __('home.Publish with a clear view'), 'copy' => __('home.Ship when it holds. Custom domain and GitHub import unlock on paid packs.')],
            ] as $index => $step)
                <article @class(['bg-krikkit-canvas p-6 md:p-10', 'lg:border-r lg:border-krikkit-line' => $index < 2])>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-krikkit-subtle">{{ $step['n'] }}</p>
                    <h3 class="mt-4 text-lg font-medium text-krikkit-fg">{{ $step['title'] }}</h3>
                    <p class="mt-3 text-sm leading-relaxed text-krikkit-muted">{{ $step['copy'] }}</p>
                </article>
            @endforeach
        </div>
        <div class="relative flex flex-col items-start justify-between gap-6 border-t border-krikkit-line px-6 py-10 md:flex-row md:items-center md:px-12">
            <div>
                <p class="text-sm text-krikkit-muted">{{ __('home.Time to a first preview') }}</p>
                <p class="mt-1 text-3xl font-medium tracking-tight text-krikkit-fg">{{ __('home.One sitting') }}</p>
            </div>
            <a href="#overview" class="inline-flex items-center gap-2 text-sm font-medium text-krikkit-fg hover:text-accent-content">
                {{ __('home.See how a turn runs') }}
                <krikkit:icon name="arrow-right" class="size-4" />
            </a>
        </div>
    </div>
</section>

<section class="border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
        <blockquote class="relative px-6 py-16 md:px-12 md:py-24">
            <p class="max-w-3xl text-2xl font-medium leading-snug tracking-tight text-krikkit-fg md:text-4xl">
                “{{ __('home.We went from a sentence to a page we could click through before the meeting ended.') }}”
            </p>
            <footer class="mt-8 text-sm text-krikkit-muted">
                <span class="font-medium text-krikkit-fg">{{ __('home.Studio lead') }}</span>
                <span> · {{ __('home.Independent practice') }}</span>
            </footer>
        </blockquote>
    </div>
</section>
