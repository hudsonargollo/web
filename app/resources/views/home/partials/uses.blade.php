<section id="stories" class="scroll-mt-20 border-b border-krikkit-line">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
        <div class="relative px-6 pt-20 md:px-12 md:pt-28">
            @include('home.partials.badge', ['label' => __('home.Stories')])
            <h2 class="mt-6 max-w-3xl text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg md:text-5xl">
                {{ __('home.Ship the pages teams actually need') }}
            </h2>
        </div>
        <div class="relative mt-12 grid gap-px border-t border-krikkit-line bg-krikkit-line lg:grid-cols-3">
            @foreach ([
                [
                    'title' => __('home.Studio'),
                    'copy' => __('home.Portfolios, case studies, and visit pages from one brief.'),
                    'tasks' => [
                        __('home.Portfolio landing'),
                        __('home.Case studies'),
                        __('home.Visit form'),
                    ],
                ],
                [
                    'title' => __('home.Shop'),
                    'copy' => __('home.Catalog grids and product pages you can open as files.'),
                    'tasks' => [
                        __('home.Catalog grid'),
                        __('home.Product page'),
                        __('home.Hours and pickup'),
                    ],
                ],
                [
                    'title' => __('home.Docs'),
                    'copy' => __('home.Guides and reference pages that stay in the same tree.'),
                    'tasks' => [
                        __('home.Guide index'),
                        __('home.Reference page'),
                        __('home.Release notes'),
                    ],
                ],
            ] as $column)
                <div class="flex flex-col gap-px bg-krikkit-line">
                    <div class="bg-krikkit-canvas px-6 py-8">
                        <h3 class="text-lg font-medium text-krikkit-fg">{{ $column['title'] }}</h3>
                        <p class="mt-2 text-sm leading-relaxed text-krikkit-muted">{{ $column['copy'] }}</p>
                    </div>
                    @foreach ($column['tasks'] as $task)
                        <div class="flex items-center gap-3 bg-krikkit-canvas px-6 py-4">
                            <span class="inline-flex size-8 items-center justify-center border border-krikkit-line bg-krikkit-surface">
                                <krikkit:icon name="check" class="size-4 text-accent-content" />
                            </span>
                            <p class="text-sm text-krikkit-fg">{{ $task }}</p>
                        </div>
                    @endforeach
                </div>
            @endforeach
        </div>
    </div>
</section>
