@php
    use App\Finance\FinanceCopy;
@endphp

<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ $invoice->formattedAmount() }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ $invoice->user?->name ?: __('dashboard.Unlinked') }} · {{ FinanceCopy::driver($invoice->driver) }}</p>
        </div>
        @allows('finance.revise')
            @if ($invoice->canRefund())
                <krikkit:button type="button" variant="danger" wire:click="askRefund">{{ __('dashboard.Refund') }}</krikkit:button>
            @endif
        @endallows
    </div>

    @php $tone = FinanceCopy::invoice($invoice->status); @endphp

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Status') }}</p>
            <div class="mt-2"><krikkit:badge :color="$tone['color']" size="xs">{{ $tone['label'] }}</krikkit:badge></div>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Pack') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ $invoice->plan?->title ?: '—' }}</p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Paid') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ $invoice->paid_at?->format('M j, Y H:i') ?: '—' }}</p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Refunded') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ $invoice->refunded_at?->format('M j, Y H:i') ?: '—' }}</p>
        </krikkit:card>
    </div>

    <krikkit:card class="space-y-4">
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Provider') }}</p>
        <div class="grid gap-4 sm:grid-cols-2">
            <div>
                <p class="text-[11px] text-krikkit-subtle">{{ __('dashboard.Provider invoice') }}</p>
                <p class="mt-1 break-all text-sm text-krikkit-fg">{{ $invoice->provider_invoice_id ?: '—' }}</p>
            </div>
            <div>
                <p class="text-[11px] text-krikkit-subtle">{{ __('dashboard.Provider subscription') }}</p>
                <p class="mt-1 break-all text-sm text-krikkit-fg">{{ $invoice->provider_subscription_id ?: '—' }}</p>
            </div>
            @if ($invoice->entitlement)
                <div>
                    <p class="text-[11px] text-krikkit-subtle">{{ __('dashboard.Subscription') }}</p>
                    <a href="{{ route('dashboard.finance.subscriptions.show', $invoice->entitlement) }}" wire:navigate class="mt-1 inline-block text-sm text-krikkit-fg hover:underline">
                        {{ $invoice->entitlement->plan?->title ?: __('dashboard.Subscription') }}
                    </a>
                </div>
            @endif
            @if ($invoice->refundedBy)
                <div>
                    <p class="text-[11px] text-krikkit-subtle">{{ __('dashboard.Refunded by') }}</p>
                    <p class="mt-1 text-sm text-krikkit-fg">{{ $invoice->refundedBy->name }}</p>
                </div>
            @endif
        </div>
    </krikkit:card>

    @if ($invoice->events->isNotEmpty())
        <div class="space-y-3">
            <h2 class="text-sm font-medium text-krikkit-fg">{{ __('dashboard.Events') }}</h2>
            <krikkit:table>
                <krikkit:table.columns>
                    <krikkit:table.column>{{ __('dashboard.Event') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                </krikkit:table.columns>
                <krikkit:table.rows>
                    @foreach ($invoice->events as $event)
                        @php $eventTone = FinanceCopy::event($event->status); @endphp
                        <krikkit:table.row>
                            <krikkit:table.cell>
                                <a href="{{ route('dashboard.finance.events.show', $event) }}" wire:navigate class="text-xs font-medium text-krikkit-fg hover:underline">
                                    {{ $event->event_type }}
                                </a>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <krikkit:badge :color="$eventTone['color']" size="xs">{{ $eventTone['label'] }}</krikkit:badge>
                            </krikkit:table.cell>
                        </krikkit:table.row>
                    @endforeach
                </krikkit:table.rows>
            </krikkit:table>
        </div>
    @endif

    <krikkit:confirm name="refund-invoice" :title="__('dashboard.Refund')" :copy="__('dashboard.Refund this invoice?')">
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="confirmPending">
                {{ __('dashboard.Refund') }}
            </krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</div>
