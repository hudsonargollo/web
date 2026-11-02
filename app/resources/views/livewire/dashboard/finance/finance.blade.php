@php
    use App\Finance\FinanceCopy;
    use App\Finance\Money;

    $seriesMax = max(1, collect($cards['series'])->max('value') ?: 1);
    $healthTotal = max(1, array_sum($cards['health']));
@endphp

<div class="space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Finance') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Revenue, collections, credit liability, and payment events.') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <krikkit:dropdown align="end">
                <x-slot:trigger>
                    <krikkit:button
                        type="button"
                        variant="ghost"
                        square
                        size="sm"
                        aria-label="{{ __('dashboard.Export') }}"
                        title="{{ __('dashboard.Export') }}"
                    >
                        <krikkit:icon name="arrow-down-tray" class="size-4" />
                    </krikkit:button>
                </x-slot:trigger>
                <x-slot:menu>
                    <krikkit:dropdown.item wire:click="export('csv')" x-on:click="open = false">
                        {{ __('dashboard.CSV') }}
                    </krikkit:dropdown.item>
                    @if ($canAdvancedExport)
                        <krikkit:dropdown.item wire:click="export('tsv')" x-on:click="open = false">
                            {{ __('dashboard.TSV') }}
                        </krikkit:dropdown.item>
                        <krikkit:dropdown.item wire:click="export('json')" x-on:click="open = false">
                            {{ __('dashboard.JSON') }}
                        </krikkit:dropdown.item>
                    @endif
                </x-slot:menu>
            </krikkit:dropdown>
            <span class="rounded-md bg-krikkit-soft px-2 py-1 text-[11px] font-medium text-krikkit-fg-soft">{{ $cards['month'] }}</span>
            <span class="rounded-md bg-krikkit-soft px-2 py-1 text-[11px] font-medium tabular-nums text-krikkit-fg-soft">{{ $cards['currency'] }}</span>
        </div>
    </div>

    @include('livewire.dashboard.finance.options.nav')

    <div class="grid gap-3 lg:grid-cols-3">
        <krikkit:card class="lg:col-span-2">
            <div class="grid gap-6 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-end">
                <div>
                    <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Collected this month') }}</p>
                    <p class="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-krikkit-fg">{{ Money::format($cards['collected'], $cards['currency']) }}</p>
                    <p class="mt-1 flex items-center gap-2 text-[11px] text-krikkit-muted">
                        @include('livewire.dashboard.finance.partials.delta', ['delta' => $cards['collected_delta']])
                        <span>{{ __('dashboard.vs last month') }}</span>
                    </p>
                </div>
                <div class="grid grid-cols-6 gap-2" aria-hidden="true">
                    @foreach ($cards['series'] as $point)
                        <div class="flex flex-col items-center gap-1.5">
                            <div class="relative h-14 w-full">
                                <div class="absolute inset-x-0 bottom-0 mx-auto w-2.5 rounded-full bg-krikkit-fg/85" style="height: {{ max(14, (int) round(($point['value'] / $seriesMax) * 100)) }}%"></div>
                            </div>
                            <span class="text-[10px] leading-none text-krikkit-subtle">{{ $point['label'] }}</span>
                        </div>
                    @endforeach
                </div>
            </div>
        </krikkit:card>

        <krikkit:card>
            <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.MRR') }}</p>
            <p class="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-krikkit-fg">{{ Money::format($cards['mrr'], $cards['currency']) }}</p>
            <p class="mt-1 text-[11px] text-krikkit-muted">{{ number_format($cards['active']) }} {{ __('dashboard.active subscriptions') }}</p>
            <p class="mt-3 text-[11px] text-krikkit-subtle">{{ __('dashboard.Active subscriptions, yearly divided by 12.') }}</p>
        </krikkit:card>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <krikkit:card>
            <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Net after API') }}</p>
            <p class="mt-2 text-xl font-semibold tabular-nums text-krikkit-fg">{{ Money::format($cards['net'], $cards['currency']) }}</p>
            <p class="mt-1 text-[11px] text-krikkit-muted">
                {{ __('dashboard.Collected :revenue · est. API :cost (:credits credits)', [
                    'revenue' => Money::format($cards['collected'], $cards['currency']),
                    'cost' => Money::format($cards['api_usd'], $cards['currency']),
                    'credits' => number_format($cards['credits_burned']),
                ]) }}
            </p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Failed charges') }}</p>
            <p class="mt-2 text-xl font-semibold tabular-nums text-krikkit-fg">{{ number_format($cards['failed']) }}</p>
            <p class="mt-1 flex items-center gap-2 text-[11px] text-krikkit-muted">
                @include('livewire.dashboard.finance.partials.delta', ['delta' => $cards['failed_delta']])
                <span>{{ __('dashboard.Failed invoices this month.') }}</span>
            </p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Cancellations') }}</p>
            <p class="mt-2 text-xl font-semibold tabular-nums text-krikkit-fg">{{ number_format($cards['canceled']) }}</p>
            <p class="mt-1 flex items-center gap-2 text-[11px] text-krikkit-muted">
                @include('livewire.dashboard.finance.partials.delta', ['delta' => $cards['canceled_delta']])
                <span>{{ __('dashboard.Canceled subscriptions this month.') }}</span>
            </p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Credit liability') }}</p>
            <p class="mt-2 text-xl font-semibold tabular-nums text-krikkit-fg">{{ number_format($cards['credit_liability']) }}</p>
            <p class="mt-1 text-[11px] text-krikkit-muted">
                {{ __('dashboard.Unused pack and grant credits.') }}
                @if ($cards['unlimited_holders'] > 0)
                    · {{ __('dashboard.:count unlimited', ['count' => $cards['unlimited_holders']]) }}
                @endif
            </p>
        </krikkit:card>
    </div>

    <div class="grid gap-3 xl:grid-cols-2">
        <krikkit:card>
            <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Collections by method') }}</p>
            @if (count($cards['mix']) === 0)
                <p class="mt-4 text-sm text-krikkit-muted">{{ __('dashboard.No collections this month.') }}</p>
            @else
                <div class="mt-4 space-y-3">
                    @foreach ($cards['mix'] as $row)
                        <div>
                            <div class="mb-1 flex items-center justify-between text-[11px]">
                                <span class="font-medium text-krikkit-fg">{{ FinanceCopy::driver($row['driver']) }}</span>
                                <span class="tabular-nums text-krikkit-muted">{{ Money::format($row['amount'], $cards['currency']) }} · {{ $row['share'] }}%</span>
                            </div>
                            <div class="h-1.5 overflow-hidden rounded-full bg-krikkit-soft">
                                <div class="h-full rounded-full bg-krikkit-fg" style="width: {{ min(100, $row['share']) }}%"></div>
                            </div>
                        </div>
                    @endforeach
                </div>
            @endif
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Invoice health') }}</p>
            <div class="mt-4 grid grid-cols-4 gap-2">
                @foreach (['paid', 'open', 'failed', 'refunded'] as $key)
                    <div>
                        <p class="text-[10px] uppercase tracking-wide text-krikkit-muted">{{ __('dashboard.'.ucfirst($key)) }}</p>
                        <p class="mt-1 text-lg font-semibold tabular-nums text-krikkit-fg">{{ number_format($cards['health'][$key]) }}</p>
                    </div>
                @endforeach
            </div>
            <div class="mt-4 flex h-1.5 overflow-hidden rounded-full bg-krikkit-soft">
                <div class="bg-teal-600" style="width: {{ ($cards['health']['paid'] / $healthTotal) * 100 }}%"></div>
                <div class="bg-blue-500" style="width: {{ ($cards['health']['open'] / $healthTotal) * 100 }}%"></div>
                <div class="bg-red-500" style="width: {{ ($cards['health']['failed'] / $healthTotal) * 100 }}%"></div>
                <div class="bg-zinc-400" style="width: {{ ($cards['health']['refunded'] / $healthTotal) * 100 }}%"></div>
            </div>
        </krikkit:card>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
        <section class="space-y-3">
            <div class="flex items-end justify-between gap-3">
                <h2 class="text-sm font-medium text-krikkit-fg">{{ __('dashboard.Recent invoices') }}</h2>
                <a href="{{ route('dashboard.invoices.index') }}" wire:navigate class="text-[11px] text-krikkit-muted hover:text-krikkit-fg">{{ __('dashboard.View all') }}</a>
            </div>
            @if ($invoices->isEmpty())
                <div class="rounded-xl border border-dashed border-krikkit-line px-4 py-8 text-center text-sm text-krikkit-muted">
                    {{ __('dashboard.No invoices yet. Checkout and invoice.paid webhooks land here.') }}
                </div>
            @else
                <krikkit:table fit>
                    <krikkit:table.columns>
                        <krikkit:table.column>{{ __('dashboard.User') }}</krikkit:table.column>
                        <krikkit:table.column>{{ __('dashboard.Amount') }}</krikkit:table.column>
                        <krikkit:table.column align="right">{{ __('dashboard.Status') }}</krikkit:table.column>
                    </krikkit:table.columns>
                    <krikkit:table.rows>
                        @foreach ($invoices as $invoice)
                            @php $tone = FinanceCopy::invoice($invoice->status); @endphp
                            <krikkit:table.row>
                                <krikkit:table.cell>
                                    <a href="{{ route('dashboard.invoices.show', $invoice) }}" wire:navigate class="text-xs font-medium text-krikkit-fg hover:underline">
                                        {{ $invoice->user?->name ?: __('dashboard.Unlinked') }}
                                    </a>
                                    <p class="text-[11px] text-krikkit-muted">{{ $invoice->plan?->title ?: FinanceCopy::driver($invoice->driver) }} · {{ $invoice->paid_at?->format('M j') ?: $invoice->created_at?->format('M j') }}</p>
                                </krikkit:table.cell>
                                <krikkit:table.cell>
                                    <span class="tabular-nums text-krikkit-fg">{{ $invoice->formattedAmount() }}</span>
                                </krikkit:table.cell>
                                <krikkit:table.cell align="right">
                                    <krikkit:badge :color="$tone['color']" size="xs">{{ $tone['label'] }}</krikkit:badge>
                                </krikkit:table.cell>
                            </krikkit:table.row>
                        @endforeach
                    </krikkit:table.rows>
                </krikkit:table>
            @endif
        </section>

        <section class="space-y-3">
            <div class="flex items-end justify-between gap-3">
                <h2 class="text-sm font-medium text-krikkit-fg">{{ __('dashboard.Recent events') }}</h2>
                <a href="{{ route('dashboard.finance.events.index') }}" wire:navigate class="text-[11px] text-krikkit-muted hover:text-krikkit-fg">{{ __('dashboard.View all') }}</a>
            </div>
            @if ($events->isEmpty())
                <div class="rounded-xl border border-dashed border-krikkit-line px-4 py-8 text-center text-sm text-krikkit-muted">
                    {{ __('dashboard.No webhook events yet.') }}
                </div>
            @else
                <krikkit:table fit>
                    <krikkit:table.columns>
                        <krikkit:table.column>{{ __('dashboard.Event') }}</krikkit:table.column>
                        <krikkit:table.column align="right">{{ __('dashboard.Status') }}</krikkit:table.column>
                    </krikkit:table.columns>
                    <krikkit:table.rows>
                        @foreach ($events as $event)
                            @php $tone = FinanceCopy::event($event->status); @endphp
                            <krikkit:table.row>
                                <krikkit:table.cell>
                                    <a href="{{ route('dashboard.finance.events.show', $event) }}" wire:navigate class="block truncate text-xs font-medium text-krikkit-fg hover:underline">
                                        {{ $event->event_type }}
                                    </a>
                                    <p class="text-[11px] text-krikkit-muted">{{ FinanceCopy::driver($event->driver) }} · {{ $event->created_at?->format('M j, H:i') }}</p>
                                </krikkit:table.cell>
                                <krikkit:table.cell align="right">
                                    <krikkit:badge :color="$tone['color']" size="xs">{{ $tone['label'] }}</krikkit:badge>
                                </krikkit:table.cell>
                            </krikkit:table.row>
                        @endforeach
                    </krikkit:table.rows>
                </krikkit:table>
            @endif
        </section>
    </div>

    <section class="space-y-3">
        <div class="flex items-end justify-between gap-3">
            <h2 class="text-sm font-medium text-krikkit-fg">{{ __('dashboard.Recent grants') }}</h2>
            <a href="{{ route('dashboard.credits.index') }}" wire:navigate class="text-[11px] text-krikkit-muted hover:text-krikkit-fg">{{ __('dashboard.View all') }}</a>
        </div>
        @if ($grants->isEmpty())
            <div class="rounded-xl border border-dashed border-krikkit-line px-4 py-8 text-center text-sm text-krikkit-muted">
                {{ __('dashboard.No credit grants yet. Manual grants and top-ups appear here.') }}
            </div>
        @else
            <krikkit:table fit>
                <krikkit:table.columns>
                    <krikkit:table.column>{{ __('dashboard.User') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Amount') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Kind') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Granted by') }}</krikkit:table.column>
                </krikkit:table.columns>
                <krikkit:table.rows>
                    @foreach ($grants as $grant)
                        <krikkit:table.row>
                            <krikkit:table.cell>
                                <p class="text-xs font-medium text-krikkit-fg">{{ $grant->user?->name ?: '—' }}</p>
                                <p class="text-[11px] text-krikkit-muted">{{ $grant->reason ?: $grant->plan?->title }}</p>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="tabular-nums text-krikkit-fg">{{ $grant->amount > 0 ? '+'.$grant->amount : $grant->amount }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="text-krikkit-muted">{{ FinanceCopy::creditKind($grant->kind) }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="text-krikkit-muted">{{ $grant->actor?->name ?: '—' }}</span>
                            </krikkit:table.cell>
                        </krikkit:table.row>
                    @endforeach
                </krikkit:table.rows>
            </krikkit:table>
        @endif
    </section>
</div>
