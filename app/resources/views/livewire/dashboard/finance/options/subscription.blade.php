@php
    use App\Finance\FinanceCopy;
@endphp

<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ $entitlement->user?->name ?: __('dashboard.Subscription') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ $entitlement->user?->email }}</p>
    </div>

    @include('livewire.dashboard.finance.options.nav')

    @php $tone = FinanceCopy::subscription($entitlement->status); @endphp

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Pack') }}</p>
            <p class="mt-2 text-sm font-medium text-krikkit-fg">{{ $entitlement->plan?->title ?: '—' }}</p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Status') }}</p>
            <div class="mt-2"><krikkit:badge :color="$tone['color']" size="xs">{{ $tone['label'] }}</krikkit:badge></div>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Interval') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ FinanceCopy::interval($entitlement->interval) }}</p>
        </krikkit:card>
        <krikkit:card>
            <p class="text-[11px] uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Last payment') }}</p>
            <p class="mt-2 text-sm text-krikkit-fg">{{ $entitlement->last_paid_at?->format('M j, Y H:i') ?: '—' }}</p>
        </krikkit:card>
    </div>

    <krikkit:card class="space-y-4">
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Provider') }}</p>
        <div class="grid gap-4 sm:grid-cols-2">
            <div>
                <p class="text-[11px] text-krikkit-subtle">{{ __('dashboard.Method') }}</p>
                <p class="mt-1 text-sm text-krikkit-fg">{{ $entitlement->driver ? FinanceCopy::driver($entitlement->driver) : '—' }}</p>
            </div>
            <div>
                <p class="text-[11px] text-krikkit-subtle">{{ __('dashboard.Provider subscription') }}</p>
                <p class="mt-1 break-all text-sm text-krikkit-fg">{{ $entitlement->provider_subscription_id ?: '—' }}</p>
            </div>
            <div>
                <p class="text-[11px] text-krikkit-subtle">{{ __('dashboard.Started') }}</p>
                <p class="mt-1 text-sm text-krikkit-fg">{{ $entitlement->started_at?->format('M j, Y') ?: '—' }}</p>
            </div>
            <div>
                <p class="text-[11px] text-krikkit-subtle">{{ __('dashboard.Period ends') }}</p>
                <p class="mt-1 text-sm text-krikkit-fg">{{ $entitlement->ends_at?->format('M j, Y') ?: __('dashboard.Open') }}</p>
            </div>
        </div>
    </krikkit:card>

    @allows('finance.revise')
        <form wire:submit="savePack" class="space-y-4">
            <krikkit:field :label="__('dashboard.Change pack')">
                <krikkit:select size="md" wire:model="planPublicId" :value="$planPublicId" placeholder="{{ __('dashboard.Choose…') }}">
                    @foreach ($plans as $plan)
                        <krikkit:select.option :value="$plan->public_id" :selected="$planPublicId === $plan->public_id">
                            {{ $plan->title }}
                        </krikkit:select.option>
                    @endforeach
                </krikkit:select>
            </krikkit:field>
            <div class="flex flex-wrap gap-2">
                <krikkit:button type="submit">{{ __('dashboard.Save pack') }}</krikkit:button>
                <krikkit:button type="button" variant="outline" wire:click="askExtend">{{ __('dashboard.Extend period') }}</krikkit:button>
                <krikkit:button type="button" variant="danger" wire:click="askCancel">{{ __('dashboard.Cancel subscription') }}</krikkit:button>
            </div>
        </form>
    @endallows

    @if ($entitlement->invoices->isNotEmpty())
        <div class="space-y-3">
            <h2 class="text-sm font-medium text-krikkit-fg">{{ __('dashboard.Invoices') }}</h2>
            <krikkit:table>
                <krikkit:table.columns>
                    <krikkit:table.column>{{ __('dashboard.Amount') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Paid') }}</krikkit:table.column>
                </krikkit:table.columns>
                <krikkit:table.rows>
                    @foreach ($entitlement->invoices as $invoice)
                        @php $invoiceTone = FinanceCopy::invoice($invoice->status); @endphp
                        <krikkit:table.row>
                            <krikkit:table.cell>
                                <a href="{{ route('dashboard.invoices.show', $invoice) }}" wire:navigate class="text-xs font-medium text-krikkit-fg hover:underline">
                                    {{ $invoice->formattedAmount() }}
                                </a>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <krikkit:badge :color="$invoiceTone['color']" size="xs">{{ $invoiceTone['label'] }}</krikkit:badge>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="text-[11px] text-krikkit-muted">{{ $invoice->paid_at?->format('M j, Y') ?: '—' }}</span>
                            </krikkit:table.cell>
                        </krikkit:table.row>
                    @endforeach
                </krikkit:table.rows>
            </krikkit:table>
        </div>
    @endif

    <krikkit:confirm
        name="finance-subscription"
        :title="$confirmAction === 'extend' ? __('dashboard.Extend period') : __('dashboard.Cancel subscription')"
        :copy="$confirmAction === 'extend' ? __('dashboard.Add one billing period to this subscription?') : __('dashboard.Cancel this subscription?')"
    >
        <x-slot:action>
            <krikkit:button type="button" :variant="$confirmAction === 'extend' ? 'primary' : 'danger'" wire:click="confirmPending">
                {{ $confirmAction === 'extend' ? __('dashboard.Extend period') : __('dashboard.Cancel') }}
            </krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</div>
