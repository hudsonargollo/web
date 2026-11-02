<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Packs') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Create, lock, and tune workspace packs.') }}</p>
        </div>
        @allows('packs.compose')
            <krikkit:button
                href="{{ route('dashboard.packs.create') }}"
                variant="ghost"
                square
                size="sm"
                aria-label="{{ __('dashboard.New pack') }}"
                title="{{ __('dashboard.New pack') }}"
            >
                <krikkit:icon name="plus" class="size-4" />
            </krikkit:button>
        @endallows
    </div>

    @error('lock')
        <krikkit:callout tone="danger">{{ $message }}</krikkit:callout>
    @enderror
    @error('retire')
        <krikkit:callout tone="danger">{{ $message }}</krikkit:callout>
    @enderror

    @if ($packs->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No packs yet.') }}</p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Pack') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Summary') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Pricing') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Holders') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Slug') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($packs as $pack)
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <div class="flex min-w-0 items-center gap-2">
                                <p class="truncate text-xs font-medium text-krikkit-fg">{{ $pack->title }}</p>
                                @if ($pack->is_default)
                                    <krikkit:badge size="xs">{{ __('dashboard.Default') }}</krikkit:badge>
                                @endif
                            </div>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-fg-soft">{{ $pack->summary ?: '—' }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="tabular-nums text-krikkit-muted">{{ $pack->priceLine() }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $pack->entitlements_count }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $pack->slug }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            @if ($pack->isLocked())
                                <krikkit:badge color="red" size="xs">{{ __('dashboard.Locked') }}</krikkit:badge>
                            @else
                                <krikkit:badge color="teal" size="xs">{{ __('dashboard.Active') }}</krikkit:badge>
                            @endif
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <div class="inline-flex items-center gap-1">
                                @allows('packs.revise')
                                    <krikkit:button
                                        href="{{ route('dashboard.packs.edit', $pack) }}"
                                        variant="ghost"
                                        square
                                        size="sm"
                                        aria-label="{{ __('dashboard.Edit') }}"
                                        title="{{ __('dashboard.Edit') }}"
                                    >
                                        <krikkit:icon name="pencil" class="size-4" />
                                    </krikkit:button>
                                    @unless ($pack->is_default && $pack->is_active)
                                        <krikkit:button
                                            type="button"
                                            variant="ghost"
                                            square
                                            size="sm"
                                            wire:click="askLock('{{ $pack->public_id }}')"
                                            aria-label="{{ $pack->isLocked() ? __('dashboard.Unlock') : __('dashboard.Lock') }}"
                                            title="{{ $pack->isLocked() ? __('dashboard.Unlock') : __('dashboard.Lock') }}"
                                        >
                                            <krikkit:icon :name="$pack->isLocked() ? 'lock-open' : 'lock-closed'" class="size-4" />
                                        </krikkit:button>
                                    @endunless
                                @endallows
                                @allows('packs.retire')
                                    @unless ($pack->isBuiltIn() || $pack->is_default)
                                        <krikkit:button
                                            type="button"
                                            variant="ghost"
                                            square
                                            size="sm"
                                            wire:click="askRetire('{{ $pack->public_id }}')"
                                            aria-label="{{ __('dashboard.Retire') }}"
                                            title="{{ __('dashboard.Retire') }}"
                                        >
                                            <krikkit:icon name="trash" class="size-4" />
                                        </krikkit:button>
                                    @endunless
                                @endallows
                            </div>
                        </krikkit:table.cell>
                    </krikkit:table.row>
                @endforeach
            </krikkit:table.rows>
        </krikkit:table>
    @endif

    <krikkit:confirm
        name="pack-confirm"
        :title="$confirmAction === 'retire' ? __('dashboard.Retire pack') : __('dashboard.Lock pack')"
        :copy="$confirmAction === 'retire' ? __('dashboard.Retire this pack?') : __('dashboard.Lock this pack? Holders keep it; new assignments stop.')"
    >
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="confirmPending">
                {{ $confirmAction === 'retire' ? __('dashboard.Retire') : __('dashboard.Lock') }}
            </krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</div>
