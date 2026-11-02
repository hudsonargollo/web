@php
    use App\Finance\FinanceCopy;
@endphp

<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Events') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Webhook log from Stripe and PayPal, linked to invoices and subscriptions.') }}</p>
    </div>

    @include('livewire.dashboard.finance.options.nav')

    <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-56 flex-1">
            <krikkit:input size="sm" wire:model.live.debounce.300ms="search" :placeholder="__('dashboard.Search…')" />
        </div>
        <div class="w-44">
            <krikkit:select size="sm" wire:model.live="status" :value="$status" placeholder="{{ __('dashboard.Status') }}">
                <krikkit:select.option value="" :selected="$status === ''">{{ __('dashboard.All') }}</krikkit:select.option>
                <krikkit:select.option value="received" :selected="$status === 'received'">{{ __('dashboard.Received') }}</krikkit:select.option>
                <krikkit:select.option value="applied" :selected="$status === 'applied'">{{ __('dashboard.Applied') }}</krikkit:select.option>
                <krikkit:select.option value="ignored" :selected="$status === 'ignored'">{{ __('dashboard.Ignored') }}</krikkit:select.option>
                <krikkit:select.option value="failed" :selected="$status === 'failed'">{{ __('dashboard.Failed') }}</krikkit:select.option>
            </krikkit:select>
        </div>
    </div>

    @if ($rows->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No webhook events yet.') }}</p>
    @else
        <krikkit:table fit>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Event') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Method') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Linked') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Retry') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($rows as $event)
                    @php $tone = FinanceCopy::event($event->status); @endphp
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <p class="truncate text-xs font-medium text-krikkit-fg">{{ $event->event_type }}</p>
                            <p class="truncate text-[11px] text-krikkit-subtle">{{ $event->provider_event_id }}</p>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ FinanceCopy::driver($event->driver) }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <krikkit:badge :color="$tone['color']" size="xs">{{ $tone['label'] }}</krikkit:badge>
                            @if (filled($event->last_error))
                                <p class="mt-1 truncate text-[11px] text-red-600">{{ $event->last_error }}</p>
                            @endif
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <div class="flex flex-col gap-0.5 text-[11px]">
                                @if ($event->invoice)
                                    <a href="{{ route('dashboard.invoices.show', $event->invoice) }}" wire:navigate class="text-krikkit-fg hover:underline">
                                        {{ $event->invoice->formattedAmount() }}
                                    </a>
                                @endif
                                @if ($event->entitlement)
                                    <a href="{{ route('dashboard.finance.subscriptions.show', $event->entitlement) }}" wire:navigate class="text-krikkit-muted hover:underline">
                                        {{ $event->entitlement->user?->name ?: __('dashboard.Subscription') }}
                                    </a>
                                @endif
                                @if (! $event->invoice && ! $event->entitlement)
                                    <span class="text-krikkit-subtle">—</span>
                                @endif
                            </div>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="tabular-nums text-krikkit-muted">{{ (int) $event->attempts }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <div class="inline-flex items-center gap-1">
                                @allows('finance.revise')
                                    <krikkit:button
                                        type="button"
                                        variant="ghost"
                                        square
                                        size="sm"
                                        wire:click="retry('{{ $event->public_id }}')"
                                        aria-label="{{ __('dashboard.Retry') }}"
                                    >
                                        <krikkit:icon name="arrow-path" class="size-4" />
                                    </krikkit:button>
                                @endallows
                                <krikkit:button
                                    href="{{ route('dashboard.finance.events.show', $event) }}"
                                    variant="ghost"
                                    square
                                    size="sm"
                                    aria-label="{{ __('dashboard.Show') }}"
                                >
                                    <krikkit:icon name="eye" class="size-4" />
                                </krikkit:button>
                            </div>
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
