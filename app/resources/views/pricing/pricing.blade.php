<x-layouts.app>
    <div
        x-data="{ menu: false, billing: 'monthly' }"
        x-on:keydown.escape.window="menu = false"
        class="min-h-screen bg-krikkit-canvas text-krikkit-fg"
    >
        @include('home.partials.header')
        <main>
            <section class="border-b border-krikkit-line">
                <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
                    <div class="pointer-events-none absolute inset-0 krikkit-home-dots" aria-hidden="true"></div>
                    <div class="relative flex flex-col items-center px-6 pt-20 pb-10 text-center sm:px-10 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20">
                        <span class="inline-flex items-center gap-2 border border-krikkit-line bg-krikkit-soft px-3 py-1.5">
                            <span class="size-1.5 bg-accent"></span>
                            <span class="text-[11px] font-semibold uppercase tracking-[0.15em] text-krikkit-fg-soft">{{ __('home.Pricing') }}</span>
                        </span>
                        <h1 class="mt-6 max-w-2xl text-3xl font-medium leading-[1.15] tracking-tight text-krikkit-fg sm:text-5xl lg:text-[3.5rem]">
                            {{ __('home.Simple pricing that follows the pack') }}
                        </h1>
                        <p class="mt-5 max-w-xl text-sm leading-relaxed text-krikkit-muted sm:text-base">
                            {{ __('home.Start on Free. Move to Pro or Agency when the desk needs more credits, domains, or GitHub.') }}
                        </p>
                        @if (session('checkout_error'))
                            <p class="mt-4 max-w-xl text-sm text-red-400">{{ session('checkout_error') }}</p>
                        @endif
                        <div class="mt-10 inline-flex items-center gap-1 border border-krikkit-line bg-krikkit-soft p-1">
                            <button
                                type="button"
                                class="px-5 py-2 text-sm font-medium transition"
                                x-on:click="billing = 'monthly'"
                                :class="billing === 'monthly' ? 'bg-krikkit-fill text-krikkit-on-fill' : 'bg-transparent text-krikkit-muted hover:text-krikkit-fg'"
                            >
                                {{ __('home.Monthly') }}
                            </button>
                            <button
                                type="button"
                                class="flex items-center gap-2 px-5 py-2 text-sm font-medium transition"
                                x-on:click="billing = 'yearly'"
                                :class="billing === 'yearly' ? 'bg-krikkit-fill text-krikkit-on-fill' : 'bg-transparent text-krikkit-muted hover:text-krikkit-fg'"
                            >
                                {{ __('home.Yearly') }}
                                <span class="inline-flex items-center bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                                    {{ __('home.Save 20%') }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div class="relative grid grid-cols-1 border-t border-krikkit-line lg:grid-cols-3">
                        @foreach ($packs as $index => $pack)
                            <article @class([
                                'flex h-full flex-col p-8',
                                'border-b border-krikkit-line lg:border-b-0' => $index < count($packs) - 1,
                                'lg:border-r lg:border-krikkit-line' => $index < count($packs) - 1,
                                'bg-krikkit-soft' => $pack['featured'],
                            ])>
                                <div class="mb-4 flex items-center justify-between gap-3">
                                    <h2 class="text-sm font-semibold text-krikkit-fg">{{ $pack['title'] }}</h2>
                                    @if ($pack['featured'])
                                        <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-content">{{ __('home.Most popular') }}</span>
                                    @endif
                                </div>
                                <div class="mb-2 flex items-baseline gap-1">
                                    <span class="text-4xl font-bold tracking-tight text-krikkit-fg sm:text-5xl" x-text="billing === 'yearly' ? @js($pack['priceYearly']) : @js($pack['price'])"></span>
                                </div>
                                <p class="mb-6 text-sm text-krikkit-muted">{{ $pack['summary'] }}</p>
                                @if (filled($pack['checkout']))
                                    <a
                                        :href="'{{ $pack['checkout'] }}?interval=' + billing"
                                        @class([
                                            'inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm font-medium transition',
                                            'bg-accent text-accent-foreground hover:opacity-90' => $pack['featured'],
                                            'bg-krikkit-fill text-krikkit-on-fill hover:opacity-90' => ! $pack['featured'],
                                        ])
                                    >
                                        {{ $pack['cta'] }}
                                        <krikkit:icon name="chevron-right" class="size-3.5" />
                                    </a>
                                @elseif (filled($pack['contact']))
                                    <a href="{{ $pack['contact'] }}" class="inline-flex w-full items-center justify-center gap-2 bg-krikkit-fill px-6 py-3 text-sm font-medium text-krikkit-on-fill transition hover:opacity-90">
                                        {{ $pack['cta'] }}
                                        <krikkit:icon name="chevron-right" class="size-3.5" />
                                    </a>
                                @else
                                    @auth
                                        <a href="{{ route('lab') }}" class="inline-flex w-full items-center justify-center gap-2 bg-krikkit-fill px-6 py-3 text-sm font-medium text-krikkit-on-fill transition hover:opacity-90">
                                            {{ __('messages.Open Lab') }}
                                            <krikkit:icon name="lab" class="size-3.5" />
                                        </a>
                                    @else
                                        <a href="{{ $site->allowRegistration() ? route('register') : route('login') }}" class="inline-flex w-full items-center justify-center gap-2 bg-krikkit-fill px-6 py-3 text-sm font-medium text-krikkit-on-fill transition hover:opacity-90">
                                            {{ $site->allowRegistration() ? $pack['cta'] : __('messages.Log in') }}
                                            <krikkit:icon name="chevron-right" class="size-3.5" />
                                        </a>
                                    @endauth
                                @endif
                                <div class="mt-8 flex-1">
                                    <p class="mb-4 text-[11px] font-semibold uppercase tracking-wide text-krikkit-muted">{{ __('home.What\'s included') }}</p>
                                    <ul class="space-y-3">
                                        @foreach ($pack['bullets'] as $bullet)
                                            <li class="flex items-start gap-2.5 text-sm text-krikkit-fg-soft">
                                                <span class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/20">
                                                    <krikkit:icon name="check" class="size-2.5 text-accent-content" />
                                                </span>
                                                <span>{{ $bullet }}</span>
                                            </li>
                                        @endforeach
                                    </ul>
                                </div>
                            </article>
                        @endforeach
                    </div>
                </div>
            </section>

            <section class="border-b border-krikkit-line">
                <div class="relative mx-auto max-w-7xl overflow-hidden border-x border-krikkit-line">
                    <div class="px-6 py-16 sm:px-10 lg:px-12 lg:py-20">
                        <h2 class="text-2xl font-medium tracking-tight text-krikkit-fg sm:text-3xl">{{ __('home.Compare packs') }}</h2>
                        <p class="mt-3 max-w-xl text-sm text-krikkit-muted">{{ __('home.Packs set project ceilings, monthly Lab credits, domains, and GitHub import.') }}</p>
                        <div class="mt-10 overflow-x-auto border border-krikkit-line">
                            <table class="w-full min-w-[36rem] text-left text-sm">
                                <thead class="border-b border-krikkit-line bg-krikkit-soft text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-muted">
                                    <tr>
                                        <th class="px-5 py-4 font-semibold">{{ __('home.What\'s included') }}</th>
                                        @foreach ($comparison['columns'] as $column)
                                            <th class="px-5 py-4 font-semibold">{{ $column }}</th>
                                        @endforeach
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-krikkit-line">
                                    @foreach ($comparison['rows'] as $row)
                                        <tr>
                                            <th class="px-5 py-4 font-medium text-krikkit-fg-soft">{{ $row['label'] }}</th>
                                            @foreach ($row['values'] as $value)
                                                <td class="px-5 py-4 text-krikkit-fg">
                                                    @if (($value['type'] ?? '') === 'flag')
                                                        @if ($value['on'] ?? false)
                                                            <krikkit:icon name="check" class="size-4 text-accent-content" />
                                                            <span class="sr-only">{{ __('home.Included') }}</span>
                                                        @else
                                                            <span class="text-krikkit-subtle">—</span>
                                                            <span class="sr-only">{{ __('home.Not included') }}</span>
                                                        @endif
                                                    @else
                                                        {{ $value['text'] ?? '—' }}
                                                    @endif
                                                </td>
                                            @endforeach
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            @include('home.partials.cta')
        </main>
        @include('home.partials.footer')
    </div>
</x-layouts.app>
