<x-layouts.app>
    <div class="min-h-screen bg-krikkit-canvas">
        <header class="border-b border-krikkit-line bg-krikkit-surface">
            <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
                <a href="{{ route('pricing') }}" class="text-sm font-semibold tracking-tight text-krikkit-fg">{{ $site->name() }}</a>
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('dashboard.Secure checkout') }}</p>
            </div>
        </header>

        <main class="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-5 lg:py-16">
            <section class="border border-krikkit-line bg-krikkit-surface p-6 sm:p-8 lg:col-span-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('dashboard.Order summary') }}</p>
                <div class="mt-4 flex items-start justify-between gap-4">
                    <div>
                        <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">{{ $plan->title }}</h1>
                        <p class="mt-2 text-sm leading-relaxed text-krikkit-muted">{{ $plan->summary }}</p>
                    </div>
                    <a href="{{ route('pricing') }}" class="shrink-0 text-sm text-krikkit-muted underline hover:text-krikkit-fg">{{ __('dashboard.Change pack') }}</a>
                </div>

                <div class="mt-8 inline-flex items-center gap-1 border border-krikkit-line bg-krikkit-soft/40 p-1">
                    <a
                        href="{{ route('checkout.start', $plan) }}?interval=monthly"
                        @class([
                            'px-4 py-1.5 text-sm font-medium transition',
                            'bg-krikkit-fill text-krikkit-on-fill' => $interval === 'monthly',
                            'text-krikkit-muted hover:text-krikkit-fg' => $interval !== 'monthly',
                        ])
                    >
                        {{ __('home.Monthly') }}
                    </a>
                    <a
                        href="{{ route('checkout.start', $plan) }}?interval=yearly"
                        @class([
                            'px-4 py-1.5 text-sm font-medium transition',
                            'bg-krikkit-fill text-krikkit-on-fill' => $interval === 'yearly',
                            'text-krikkit-muted hover:text-krikkit-fg' => $interval !== 'yearly',
                        ])
                    >
                        {{ __('home.Yearly') }}
                    </a>
                </div>

                <dl class="mt-8 divide-y divide-krikkit-line border-y border-krikkit-line text-sm">
                    <div class="flex items-center justify-between gap-4 py-3">
                        <dt class="text-krikkit-muted">{{ $plan->title }} · {{ $interval === 'yearly' ? __('home.Yearly') : __('home.Monthly') }}</dt>
                        <dd class="font-medium text-krikkit-fg">{{ $price }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-4 py-3">
                        <dt class="text-krikkit-muted">{{ __('dashboard.Billed today') }}</dt>
                        <dd class="text-lg font-semibold text-krikkit-fg">{{ $price }}</dd>
                    </div>
                </dl>

                @if ($features !== [])
                    <div class="mt-8">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('dashboard.Included in this pack') }}</p>
                        <ul class="mt-4 space-y-2.5">
                            @foreach ($features as $feature)
                                <li class="flex items-start gap-2.5 text-sm text-krikkit-fg">
                                    <krikkit:icon name="check" class="mt-0.5 size-4 text-accent-content" />
                                    <span>{{ $feature }}</span>
                                </li>
                            @endforeach
                        </ul>
                    </div>
                @endif
            </section>

            <aside class="lg:col-span-2">
                <section class="border border-krikkit-line bg-krikkit-surface p-6 sm:p-8">
                    <h2 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Payment') }}</h2>
                    @if ($account !== '')
                        <p class="mt-2 text-sm text-krikkit-muted">{{ $account }}</p>
                    @endif

                    <div class="mt-6 space-y-3">
                        @forelse ($drivers as $row)
                            <form method="GET" action="{{ route('checkout.start', $plan) }}">
                                <input type="hidden" name="interval" value="{{ $interval }}">
                                <input type="hidden" name="driver" value="{{ $row['driver'] }}">
                                <krikkit:button type="submit" class="w-full !rounded-none" :variant="$row['driver'] === 'stripe' ? 'primary' : 'outline'">
                                    {{ __('dashboard.Pay with :method', ['method' => $row['title']]) }}
                                </krikkit:button>
                            </form>
                        @empty
                            <krikkit:callout tone="warning">
                                <krikkit:callout.text>{{ __('dashboard.Checkout is not configured.') }}</krikkit:callout.text>
                            </krikkit:callout>
                        @endforelse
                    </div>

                    <p class="mt-6 flex items-start gap-2 text-xs leading-relaxed text-krikkit-muted">
                        <krikkit:icon name="lock-closed" class="mt-0.5 size-3.5 shrink-0" />
                        <span>{{ __('dashboard.You will finish payment on a secure page.') }}</span>
                    </p>
                </section>

                <p class="mt-4 text-sm text-krikkit-muted">
                    <a href="{{ route('pricing') }}" class="underline hover:text-krikkit-fg">{{ __('dashboard.Back to pricing') }}</a>
                </p>
            </aside>
        </main>
    </div>
</x-layouts.app>
