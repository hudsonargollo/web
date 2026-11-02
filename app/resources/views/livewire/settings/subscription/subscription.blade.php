@php
    use App\Finance\FinanceCopy;
@endphp

<x-settings.frame section="subscription">
    <div class="space-y-10" x-data="{ billing: 'monthly' }">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">{{ __('settings.Subscription') }}</h1>
            <p class="mt-1 text-sm text-krikkit-muted">{{ __('settings.You are on this pack. Higher packs appear below when an upgrade is available.') }}</p>
        </div>

        <krikkit:card class="space-y-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('settings.Current pack') }}</p>
            <div class="flex flex-wrap items-baseline justify-between gap-3">
                <h2 class="text-lg font-semibold text-krikkit-fg">{{ $currentPlan->title }}</h2>
                <p class="text-sm text-krikkit-muted">{{ $currentPlan->formatPrice($entitlement?->interval?->value ?? 'monthly') }}</p>
            </div>
            @if ($entitlement?->interval)
                <p class="text-sm text-krikkit-muted">{{ __('settings.Billed') }} · {{ FinanceCopy::interval($entitlement->interval) }}</p>
            @endif
            @if ($entitlement?->ends_at)
                <p class="text-sm text-krikkit-muted">{{ __('settings.Renews') }} · {{ $entitlement->ends_at->toFormattedDateString() }}</p>
            @endif
        </krikkit:card>

        @if ($offers === [])
            <p class="text-sm text-krikkit-muted">{{ __('settings.You are on the highest pack.') }}</p>
        @else
            <div>
                <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm font-medium text-krikkit-muted">{{ __('settings.Choose a pack') }}</p>
                    <div class="inline-flex items-center gap-1 border border-krikkit-line bg-krikkit-soft p-1">
                        <button type="button" class="px-3 py-1.5 text-sm font-medium" x-on:click="billing = 'monthly'" :class="billing === 'monthly' ? 'bg-krikkit-fill text-krikkit-on-fill' : 'text-krikkit-muted'">{{ __('settings.Monthly') }}</button>
                        <button type="button" class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium" x-on:click="billing = 'yearly'" :class="billing === 'yearly' ? 'bg-krikkit-fill text-krikkit-on-fill' : 'text-krikkit-muted'">
                            {{ __('settings.Yearly') }}
                            <span class="bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">{{ __('settings.Save 20%') }}</span>
                        </button>
                    </div>
                </div>
                <div class="grid gap-4">
                    @foreach ($offers as $pack)
                        <krikkit:card class="flex flex-col gap-5">
                            <div class="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 class="text-sm font-semibold text-krikkit-fg">{{ $pack['title'] }}</h3>
                                    <p class="mt-1 text-sm text-krikkit-muted">{{ $pack['summary'] }}</p>
                                </div>
                                <p class="text-2xl font-semibold tracking-tight text-krikkit-fg" x-text="billing === 'yearly' ? @js($pack['priceYearly']) : @js($pack['price'])"></p>
                            </div>
                            <ul class="space-y-2">
                                @foreach ($pack['bullets'] as $bullet)
                                    <li class="flex items-start gap-2 text-sm text-krikkit-fg-soft">
                                        <krikkit:icon name="check" class="mt-0.5 size-4 text-accent-content" />
                                        <span>{{ $bullet }}</span>
                                    </li>
                                @endforeach
                            </ul>
                            @if (filled($pack['checkout']))
                                <a
                                    :href="'{{ $pack['checkout'] }}?interval=' + billing"
                                    class="inline-flex h-10 items-center justify-center rounded-full border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90"
                                >
                                    {{ $pack['cta'] }}
                                </a>
                            @elseif (filled($pack['contact']))
                                <krikkit:button :href="$pack['contact']">{{ $pack['cta'] }}</krikkit:button>
                            @endif
                        </krikkit:card>
                    @endforeach
                </div>
            </div>
        @endif
    </div>
</x-settings.frame>
