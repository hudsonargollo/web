@props([
    'catalog',
    'builtIn' => false,
    'creditExamples' => [],
])

@php
    use App\Entitlement\GrantKind;
    use App\Entitlement\UsageWindow;
@endphp

<div class="space-y-4">
    <krikkit:card class="space-y-4 !border-0 !p-5">
        <p class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('dashboard.Identity') }}</p>

        <krikkit:field :label="__('dashboard.Title')">
            <krikkit:input wire:model="title" id="title" :placeholder="__('dashboard.Pro')" :invalid="$errors->has('title')" required />
            @error('title')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>

        <krikkit:field :label="__('dashboard.Slug')">
            <krikkit:input wire:model="slug" id="slug" :placeholder="__('dashboard.pro')" :invalid="$errors->has('slug')" :disabled="$builtIn" />
            @error('slug')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>

        <krikkit:field :label="__('dashboard.Summary')">
            <krikkit:input wire:model="summary" id="summary" :placeholder="__('dashboard.For growing teams')" :invalid="$errors->has('summary')" />
            @error('summary')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>

        <krikkit:field :label="__('dashboard.Rank')">
            <krikkit:input type="number" min="0" max="999" wire:model="rank" id="rank" :placeholder="__('dashboard.10')" :invalid="$errors->has('rank')" />
            @error('rank')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>

        <div class="flex flex-col gap-3 pt-1">
            <krikkit:switch wire:model="isDefault" :label="__('dashboard.Default pack')" />
            <p class="text-xs text-krikkit-muted">{{ __('dashboard.New accounts receive this pack.') }}</p>
            @error('isDefault')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror

            <krikkit:switch wire:model="isActive" :label="__('dashboard.Available to assign')" />
            <p class="text-xs text-krikkit-muted">{{ __('dashboard.Locked packs stay on current holders.') }}</p>
            @error('isActive')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </div>
    </krikkit:card>

    <krikkit:card class="space-y-4 !border-0 !p-5">
        <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('dashboard.Pricing') }}</p>
            <p class="mt-1 text-xs text-krikkit-muted">{{ __('dashboard.List prices for monthly and yearly billing. Leave blank if unset.') }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
            <krikkit:field :label="__('dashboard.Monthly price')">
                <krikkit:input
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    wire:model="priceMonthly"
                    id="priceMonthly"
                    :placeholder="__('dashboard.29.00')"
                    :invalid="$errors->has('priceMonthly')"
                >
                    <x-slot:prefix>{{ $this->packCurrencySymbol() }}</x-slot:prefix>
                    <x-slot:suffix>{{ $this->packCurrency() }}</x-slot:suffix>
                </krikkit:input>
                <x-slot:description>{{ __('dashboard.Billed each month. 0 is free.') }}</x-slot:description>
                @error('priceMonthly')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Yearly price')">
                <krikkit:input
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    wire:model="priceYearly"
                    id="priceYearly"
                    :placeholder="__('dashboard.290.00')"
                    :invalid="$errors->has('priceYearly')"
                >
                    <x-slot:prefix>{{ $this->packCurrencySymbol() }}</x-slot:prefix>
                    <x-slot:suffix>{{ $this->packCurrency() }}</x-slot:suffix>
                </krikkit:input>
                <x-slot:description>{{ __('dashboard.Billed once a year. Usually a discount vs 12 months.') }}</x-slot:description>
                @error('priceYearly')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </div>
    </krikkit:card>

    <krikkit:card class="space-y-5 !border-0 !p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('dashboard.Grants') }}</p>

        @foreach ($catalog as $definition)
            @php
                $code = $definition['code'];
                $title = __('dashboard.'.$definition['title']);
            @endphp

            <div class="space-y-3 border-t border-krikkit-line pt-4 first:border-t-0 first:pt-0">
                <p class="text-sm font-medium text-krikkit-fg">{{ $title }}</p>

                @if ($definition['kind'] === GrantKind::Feature)
                    <krikkit:switch wire:model="grants.{{ $code }}.allowed" :label="__('dashboard.Included')" />
                    @error("grants.$code.allowed")
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                    @if ($code === 'custom_subdomain')
                        <p class="text-xs text-krikkit-muted">{{ __('dashboard.Choose a readable slug. Without this, Lab assigns a random 12-character address.') }}</p>
                    @elseif ($code === 'custom_domain')
                        <p class="text-xs text-krikkit-muted">{{ __('dashboard.Point a domain at a published Lab site.') }}</p>
                    @endif
                @else
                    <krikkit:switch wire:model.live="grants.{{ $code }}.unlimited" :label="__('dashboard.Unlimited')" />
                    @unless ($grants[$code]['unlimited'] ?? false)
                        <krikkit:field :label="__('dashboard.Ceiling')">
                            <krikkit:input
                                type="number"
                                min="0"
                                max="1000000"
                                wire:model="grants.{{ $code }}.ceiling"
                                :placeholder="__('dashboard.1000')"
                                :invalid="$errors->has('grants.'.$code.'.ceiling')"
                            />
                            @error("grants.$code.ceiling")
                                <krikkit:field.error>{{ $message }}</krikkit:field.error>
                            @enderror
                        </krikkit:field>
                    @endunless
                    <p class="text-xs text-krikkit-muted">
                        @if ($definition['window'] === UsageWindow::Monthly)
                            {{ __('dashboard.Charged from real Lab usage, not per message. Resets each month.') }}
                        @elseif ($definition['code'] === 'projects')
                            {{ __('dashboard.Counts every project you keep.') }}
                        @else
                            {{ __('dashboard.Lifetime quota.') }}
                        @endif
                    </p>
                @endif
            </div>
        @endforeach
    </krikkit:card>

    @if ($creditExamples !== [])
        <krikkit:card class="space-y-4 !border-0 !p-5">
            <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-krikkit-subtle">{{ __('dashboard.Example Lab credit charges') }}</p>
                <p class="mt-1 text-xs text-krikkit-muted">{{ __('dashboard.Sample charges from real usage. Use these when setting a monthly ceiling.') }}</p>
            </div>

            <krikkit:table>
                <krikkit:table.columns>
                    <krikkit:table.column>{{ __('dashboard.Scenario') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Model') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.In') }}</krikkit:table.column>
                    <krikkit:table.column>{{ __('dashboard.Out') }}</krikkit:table.column>
                    <krikkit:table.column align="right">{{ __('dashboard.Credits') }}</krikkit:table.column>
                </krikkit:table.columns>
                <krikkit:table.rows>
                    @foreach ($creditExamples as $example)
                        <krikkit:table.row>
                            <krikkit:table.cell>
                                <span class="text-krikkit-fg">{{ $example['scenario'] }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="text-krikkit-fg-soft">{{ $example['model'] }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="tabular-nums text-krikkit-muted">{{ $example['input'] }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell>
                                <span class="tabular-nums text-krikkit-muted">{{ $example['output'] }}</span>
                            </krikkit:table.cell>
                            <krikkit:table.cell align="right">
                                <span class="tabular-nums font-medium text-krikkit-fg">{{ number_format((int) $example['credits']) }}</span>
                            </krikkit:table.cell>
                        </krikkit:table.row>
                    @endforeach
                </krikkit:table.rows>
            </krikkit:table>
        </krikkit:card>
    @endif
</div>
