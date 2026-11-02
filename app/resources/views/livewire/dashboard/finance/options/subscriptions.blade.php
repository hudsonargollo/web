@php
    use App\Finance\FinanceCopy;
@endphp

<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Subscriptions') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Who holds which pack, interval, and provider subscription.') }}</p>
    </div>

    @include('livewire.dashboard.finance.options.nav')

    <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-56 flex-1">
            <krikkit:input size="sm" wire:model.live.debounce.300ms="search" :placeholder="__('dashboard.Search…')" />
        </div>
        <div class="w-44">
            <krikkit:select size="sm" wire:model.live="status" :value="$status" placeholder="{{ __('dashboard.Status') }}">
                <krikkit:select.option value="" :selected="$status === ''">{{ __('dashboard.All') }}</krikkit:select.option>
                <krikkit:select.option value="active" :selected="$status === 'active'">{{ __('dashboard.Active') }}</krikkit:select.option>
                <krikkit:select.option value="past_due" :selected="$status === 'past_due'">{{ __('dashboard.Past due') }}</krikkit:select.option>
                <krikkit:select.option value="canceled" :selected="$status === 'canceled'">{{ __('dashboard.Canceled') }}</krikkit:select.option>
            </krikkit:select>
        </div>
    </div>

    @if ($rows->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No subscriptions match.') }}</p>
    @else
        <krikkit:table fit>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.User') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Pack') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Interval') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Period') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Last payment') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($rows as $row)
                    @php $tone = FinanceCopy::subscription($row->status); @endphp
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <p class="truncate text-xs font-medium text-krikkit-fg">{{ $row->user?->name ?: '—' }}</p>
                            <p class="truncate text-[11px] text-krikkit-muted">{{ $row->user?->email }}</p>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-fg">{{ $row->plan?->title ?: '—' }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ FinanceCopy::interval($row->interval) }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <krikkit:badge :color="$tone['color']" size="xs">{{ $tone['label'] }}</krikkit:badge>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <p class="text-[11px] text-krikkit-muted">
                                {{ $row->started_at?->format('M j, Y') ?: '—' }}
                                →
                                {{ $row->ends_at?->format('M j, Y') ?: __('dashboard.Open') }}
                            </p>
                            @if (filled($row->provider_subscription_id))
                                <p class="truncate text-[11px] text-krikkit-subtle">{{ $row->provider_subscription_id }}</p>
                            @endif
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-[11px] text-krikkit-muted">{{ $row->last_paid_at?->format('M j, Y') ?: '—' }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <krikkit:button
                                href="{{ route('dashboard.finance.subscriptions.show', $row) }}"
                                variant="ghost"
                                square
                                size="sm"
                                aria-label="{{ __('dashboard.Show') }}"
                            >
                                <krikkit:icon name="eye" class="size-4" />
                            </krikkit:button>
                        </krikkit:table.cell>
                    </krikkit:table.row>
                @endforeach
            </krikkit:table.rows>
        </krikkit:table>

        <krikkit:pagination
            goto="gotoPage"
            :current="$rows->currentPage()"
            :last="$rows->lastPage()"
            :total="$rows->total()"
            :first-item="$rows->firstItem()"
            :last-item="$rows->lastItem()"
        />
    @endif
</div>
