@php
    $stats = [
        ['value' => __('home.One desk'), 'hint' => __('home.Brief, files, and canvas')],
        ['value' => __('home.Real files'), 'hint' => __('home.Markup you can open')],
        ['value' => __('home.Pack credits'), 'hint' => __('home.Spend only on generation')],
        ['value' => __('home.Your domain'), 'hint' => __('home.When a pack unlocks it')],
    ];

    $pillars = [
        [
            'id' => 'brief',
            'icon' => 'document-text',
            'kicker' => __('messages.Brief'),
            'tone' => 'cyan',
            'title' => __('home.A shared desk for every brief'),
            'copy' => __('home.Centralize the prompt, the file tree, and the live preview so nothing lives in a side chat.'),
            'mock' => 'brief',
        ],
        [
            'id' => 'canvas',
            'icon' => 'lab',
            'kicker' => __('messages.Canvas'),
            'tone' => 'violet',
            'title' => __('home.Connect Lab to the rest of the stack'),
            'copy' => __('home.Import from GitHub, spend pack credits, and keep generated files in the workspace.'),
            'mock' => 'page',
        ],
        [
            'id' => 'files',
            'icon' => 'folder',
            'kicker' => __('messages.Files'),
            'tone' => 'orange',
            'title' => __('home.Turns that work like a studio partner'),
            'copy' => __('home.Ask for a landing, a shop grid, or a docs page. Lab writes the screens and you review them.'),
            'mock' => 'files',
        ],
        [
            'id' => 'publish',
            'icon' => 'globe-alt',
            'kicker' => __('messages.Publish'),
            'tone' => 'blue',
            'title' => __('home.Oversight for every publish'),
            'copy' => __('home.Preview first. Attach a domain when you are ready. Roll a project back by editing the files.'),
            'mock' => 'publish',
        ],
    ];

    $toneClass = [
        'cyan' => 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
        'violet' => 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
        'orange' => 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400',
        'blue' => 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    ];
@endphp

<section id="platform" class="scroll-mt-20 border-b border-krikkit-line" x-data="krikkitHomePlatform">
    <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
        <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
        <div class="relative px-6 pt-20 md:px-12 md:pt-28">
            @include('home.partials.badge', ['label' => __('home.Introducing Lab')])
            <h2 class="mt-6 max-w-3xl text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg md:text-5xl">
                {{ __('home.The workshop sites need to run from a single brief') }}
            </h2>
        </div>

        <div class="relative mt-12 grid items-start gap-10 border-t border-krikkit-line px-6 py-12 md:px-12 md:py-16 lg:grid-cols-12 lg:gap-14">
            <aside class="hidden lg:sticky lg:top-24 lg:col-span-4 lg:block lg:self-start">
                <ul class="divide-y divide-krikkit-line border border-krikkit-line">
                    @foreach ($stats as $stat)
                        <li class="px-5 py-5">
                            <p class="text-2xl font-medium tracking-tight text-krikkit-fg">{{ $stat['value'] }}</p>
                            <p class="mt-1 text-sm text-krikkit-muted">{{ $stat['hint'] }}</p>
                        </li>
                    @endforeach
                </ul>
            </aside>

            <div class="flex flex-col lg:col-span-8">
                @foreach ($pillars as $index => $pillar)
                    <article
                        id="platform-{{ $pillar['id'] }}"
                        data-platform-panel="{{ $index }}"
                        class="scroll-mt-28 border-t border-krikkit-line py-10 first:border-t-0 first:pt-0 md:py-14"
                    >
                        <span class="inline-flex items-center border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] {{ $toneClass[$pillar['tone']] }}">
                            {{ $pillar['kicker'] }}
                        </span>
                        <h3 class="mt-4 text-2xl font-medium leading-tight tracking-tight text-krikkit-fg md:text-3xl">
                            {{ $pillar['title'] }}
                        </h3>
                        <p class="mt-3 max-w-xl text-sm leading-relaxed text-krikkit-muted md:text-base">
                            {{ $pillar['copy'] }}
                        </p>
                        <div class="mt-6">
                            <krikkit:button href="#capabilities" :navigate="false" variant="fill" size="sm" class="!rounded-none">
                                {{ __('home.Learn more') }}
                                <krikkit:icon name="arrow-right" class="size-4" />
                            </krikkit:button>
                        </div>
                        @if (in_array($pillar['mock'], ['brief', 'files'], true))
                            <div class="mt-8 overflow-hidden border border-krikkit-line">
                                @include('home.partials.desk', ['tone' => $pillar['mock']])
                            </div>
                        @elseif ($pillar['mock'] === 'page')
                            <div class="mt-8 overflow-hidden border border-krikkit-line bg-krikkit-canvas">
                                @include('home.partials.site')
                            </div>
                        @else
                            <ul class="mt-8 divide-y divide-krikkit-line border border-krikkit-line">
                                <li class="flex items-center justify-between px-3 py-2.5">
                                    <span class="text-sm text-krikkit-muted">{{ __('home.Domain') }}</span>
                                    <span class="font-mono text-xs text-krikkit-fg">studio.lab</span>
                                </li>
                                <li class="flex items-center justify-between px-3 py-2.5">
                                    <span class="text-sm text-krikkit-muted">{{ __('home.GitHub') }}</span>
                                    <span class="text-xs text-krikkit-subtle">{{ __('home.Ready') }}</span>
                                </li>
                                <li class="flex h-10 items-center justify-center bg-accent text-sm font-medium text-accent-foreground">
                                    {{ __('messages.Publish') }}
                                </li>
                            </ul>
                        @endif
                    </article>
                @endforeach
            </div>
        </div>
    </div>
</section>
