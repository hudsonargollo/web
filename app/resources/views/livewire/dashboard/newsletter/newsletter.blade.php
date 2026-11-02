<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Newsletter') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Emails collected from the public home footer.') }}</p>
        </div>
        @if ($hasSubscribers)
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
                    <krikkit:dropdown.item wire:click="export('tsv')" x-on:click="open = false">
                        {{ __('dashboard.TSV') }}
                    </krikkit:dropdown.item>
                    <krikkit:dropdown.item wire:click="export('json')" x-on:click="open = false">
                        {{ __('dashboard.JSON') }}
                    </krikkit:dropdown.item>
                </x-slot:menu>
            </krikkit:dropdown>
        @endif
    </div>

    <div class="max-w-sm">
        <krikkit:input size="sm" wire:model.live.debounce.300ms="search" :placeholder="__('dashboard.Search…')" />
    </div>

    @if ($rows->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No newsletter subscribers yet.') }}</p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Email') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Joined') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($rows as $row)
                    <krikkit:table.row :key="$row->public_id">
                        <krikkit:table.cell>{{ $row->email }}</krikkit:table.cell>
                        <krikkit:table.cell>{{ $row->created_at?->timezone(config('app.timezone'))->format('Y-m-d H:i') }}</krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <krikkit:button type="button" size="sm" variant="ghost" wire:click="askRemove('{{ $row->public_id }}')">
                                {{ __('dashboard.Remove') }}
                            </krikkit:button>
                        </krikkit:table.cell>
                    </krikkit:table.row>
                @endforeach
            </krikkit:table.rows>
        </krikkit:table>
        <div class="mt-4">
            {{ $rows->links() }}
        </div>
    @endif

    <krikkit:confirm name="remove-subscriber" :title="__('dashboard.Remove subscriber')" :copy="__('dashboard.Remove this email from the list?')">
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="confirmPending">
                {{ __('dashboard.Remove') }}
            </krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</div>
