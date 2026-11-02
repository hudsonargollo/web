@php
    use App\Finance\FinanceCopy;
@endphp

<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Credits') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Purchased credits, manual grants, and adjustments. Usage stays in Lab.') }}</p>
    </div>

    @allows('finance.revise')
        <form wire:submit="grant" class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.User')">
                    <krikkit:select size="md" searchable wire:model="userPublicId" :value="$userPublicId" placeholder="{{ __('dashboard.Choose…') }}" :invalid="$errors->has('userPublicId')">
                        @foreach ($people as $person)
                            <krikkit:select.option :value="$person->public_id" :selected="$userPublicId === $person->public_id">
                                {{ $person->name }} · {{ $person->email }}
                            </krikkit:select.option>
                        @endforeach
                    </krikkit:select>
                    @error('userPublicId')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Kind')">
                    <krikkit:select size="md" wire:model.live="kind" :value="$kind" placeholder="{{ __('dashboard.Choose…') }}">
                        <krikkit:select.option value="grant" :selected="$kind === 'grant'">{{ __('dashboard.Manual grant') }}</krikkit:select.option>
                        <krikkit:select.option value="topup" :selected="$kind === 'topup'">{{ __('dashboard.Top-up') }}</krikkit:select.option>
                        <krikkit:select.option value="adjustment" :selected="$kind === 'adjustment'">{{ __('dashboard.Adjustment') }}</krikkit:select.option>
                    </krikkit:select>
                </krikkit:field>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
                @if ($kind === 'topup')
                    <krikkit:field :label="__('dashboard.Top-up pack')">
                        <krikkit:select size="md" wire:model="planPublicId" :value="$planPublicId" placeholder="{{ __('dashboard.Choose…') }}" :invalid="$errors->has('planPublicId')">
                            @foreach ($plans as $plan)
                                <krikkit:select.option :value="$plan->public_id" :selected="$planPublicId === $plan->public_id">
                                    {{ $plan->title }}
                                </krikkit:select.option>
                            @endforeach
                        </krikkit:select>
                        @error('planPublicId')
                            <krikkit:field.error>{{ $message }}</krikkit:field.error>
                        @enderror
                    </krikkit:field>
                @else
                    <krikkit:field :label="__('dashboard.Amount')">
                        <krikkit:input size="md" type="number" wire:model="amount" placeholder="+100" :invalid="$errors->has('amount')" />
                        @error('amount')
                            <krikkit:field.error>{{ $message }}</krikkit:field.error>
                        @enderror
                    </krikkit:field>
                @endif
                <krikkit:field :label="__('dashboard.Reason')">
                    <krikkit:input size="md" wire:model="reason" :placeholder="__('dashboard.Why these credits were added.')" />
                </krikkit:field>
            </div>

            <krikkit:button type="submit">{{ __('dashboard.Grant credits') }}</krikkit:button>
        </form>
    @endallows

    <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-56 flex-1">
            <krikkit:input size="sm" wire:model.live.debounce.300ms="search" :placeholder="__('dashboard.Search…')" />
        </div>
    </div>

    @if ($rows->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No credit grants yet. Manual grants and top-ups appear here.') }}</p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.User') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Amount') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Kind') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Reason') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Granted by') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.When') }}</krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($rows as $grant)
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <p class="truncate text-xs font-medium text-krikkit-fg">{{ $grant->user?->name ?: '—' }}</p>
                            <p class="truncate text-[11px] text-krikkit-muted">{{ $grant->user?->email }}</p>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="tabular-nums font-medium text-krikkit-fg">{{ $grant->amount > 0 ? '+'.$grant->amount : $grant->amount }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ FinanceCopy::creditKind($grant->kind) }}</span>
                            @if ($grant->plan)
                                <p class="text-[11px] text-krikkit-subtle">{{ $grant->plan->title }}</p>
                            @endif
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $grant->reason ?: '—' }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $grant->actor?->name ?: '—' }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-[11px] text-krikkit-muted">{{ $grant->created_at?->format('M j, Y H:i') }}</span>
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
