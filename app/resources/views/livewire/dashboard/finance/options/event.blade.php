@php
    use App\Finance\FinanceCopy;
@endphp

<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ $event->event_type }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ FinanceCopy::driver($event->driver) }} · {{ $event->provider_event_id ?: $event->public_id }}</p>
        </div>
        @allows('finance.revise')
            <krikkit:button type="button" variant="outline" wire:click="retry">{{ __('dashboard.Retry') }}</krikkit:button>
        @endallows
    </div>

    @include('livewire.dashboard.finance.options.nav')

    @php $tone = FinanceCopy::event($event->status); @endphp

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Status') }}</p>
            <div class="mt-2"><krikkit:badge :color="$tone['color']" size="xs">{{ $tone['label'] }}</krikkit:badge></div>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Retry') }}</p>
            <p class="mt-2 text-sm tabular-nums text-krikkit-fg">{{ (int) $event->attempts }}</p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Invoice') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">
                @if ($event->invoice)
                    <a href="{{ route('dashboard.invoices.show', $event->invoice) }}" wire:navigate class="hover:underline">{{ $event->invoice->formattedAmount() }}</a>
                @else
                    —
                @endif
            </p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Subscription') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">
                @if ($event->entitlement)
                    <a href="{{ route('dashboard.finance.subscriptions.show', $event->entitlement) }}" wire:navigate class="hover:underline">
                        {{ $event->entitlement->user?->name ?: __('dashboard.Subscription') }}
                    </a>
                @else
                    —
                @endif
            </p>
        </krikkit:card>
    </div>

    @if (filled($event->last_error))
        <krikkit:callout tone="danger">{{ $event->last_error }}</krikkit:callout>
    @endif

    <div class="space-y-2">
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Payload') }}</p>
        <pre class="max-h-[28rem] overflow-auto rounded-lg border border-krikkit-line bg-krikkit-soft p-4 text-xs leading-5 text-krikkit-fg">{{ $payload }}</pre>
    </div>
</div>
