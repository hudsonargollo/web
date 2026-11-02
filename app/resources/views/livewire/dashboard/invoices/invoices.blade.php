@php
    use App\Finance\FinanceCopy;
@endphp

<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Invoices') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Paid, open, failed, and refunded charges from Stripe and PayPal.') }}</p>
    </div>

    <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-56 flex-1">
            <krikkit:input size="sm" wire:model.live.debounce.300ms="search" :placeholder="__('dashboard.Search…')" />
        </div>
        <div class="w-44">
            <krikkit:select size="sm" wire:model.live="status" :value="$status" placeholder="{{ __('dashboard.Status') }}">
                <krikkit:select.option value="" :selected="$status === ''">{{ __('dashboard.All') }}</krikkit:select.option>
                <krikkit:select.option value="paid" :selected="$status === 'paid'">{{ __('dashboard.Paid') }}</krikkit:select.option>
                <krikkit:select.option value="open" :selected="$status === 'open'">{{ __('dashboard.Open') }}</krikkit:select.option>
                <krikkit:select.option value="failed" :selected="$status === 'failed'">{{ __('dashboard.Failed') }}</krikkit:select.option>
                <krikkit:select.option value="refunded" :selected="$status === 'refunded'">{{ __('dashboard.Refunded') }}</krikkit:select.option>
            </krikkit:select>
        </div>
    </div>

    @if ($rows->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No invoices yet. Checkout and invoice.paid webhooks land here.') }}</p>
    @else
        <krikkit:table fit>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.User') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Pack') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Amount') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Method') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Paid') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($rows as $invoice)
                    @php $tone = FinanceCopy::invoice($invoice->status); @endphp
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <p class="truncate text-xs font-medium text-krikkit-fg">{{ $invoice->user?->name ?: __('dashboard.Unlinked') }}</p>
                            <p class="truncate text-[11px] text-krikkit-muted">{{ $invoice->user?->email }}</p>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $invoice->plan?->title ?: '—' }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="tabular-nums text-krikkit-fg">{{ $invoice->formattedAmount() }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ FinanceCopy::driver($invoice->driver) }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <krikkit:badge :color="$tone['color']" size="xs">{{ $tone['label'] }}</krikkit:badge>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-[11px] text-krikkit-muted">{{ $invoice->paid_at?->format('M j, Y') ?: '—' }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <krikkit:button
                                href="{{ route('dashboard.invoices.show', $invoice) }}"
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
