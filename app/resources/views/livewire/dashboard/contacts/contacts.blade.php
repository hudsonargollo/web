<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Contacts') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Notes from the public contact page.') }}</p>
    </div>

    <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-56 flex-1">
            <krikkit:input size="sm" wire:model.live.debounce.300ms="search" :placeholder="__('dashboard.Search…')" />
        </div>
        <div class="w-44">
            <krikkit:select size="sm" wire:model.live="status" :value="$status" placeholder="{{ __('dashboard.Status') }}">
                <krikkit:select.option value="" :selected="$status === ''">{{ __('dashboard.All') }}</krikkit:select.option>
                <krikkit:select.option value="unread" :selected="$status === 'unread'">{{ __('dashboard.Unread') }}</krikkit:select.option>
                <krikkit:select.option value="open" :selected="$status === 'open'">{{ __('dashboard.Open') }}</krikkit:select.option>
                <krikkit:select.option value="replied" :selected="$status === 'replied'">{{ __('dashboard.Replied') }}</krikkit:select.option>
            </krikkit:select>
        </div>
    </div>

    @if ($rows->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No contacts yet.') }}</p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Name') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Email') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Pack') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Received') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($rows as $row)
                    <krikkit:table.row :key="$row->public_id">
                        <krikkit:table.cell>
                            <a href="{{ route('dashboard.contacts.show', $row) }}" wire:navigate class="text-sm font-medium text-krikkit-fg hover:underline">
                                {{ $row->name }}
                            </a>
                        </krikkit:table.cell>
                        <krikkit:table.cell>{{ $row->email }}</krikkit:table.cell>
                        <krikkit:table.cell>{{ $row->plan?->title ?: '—' }}</krikkit:table.cell>
                        <krikkit:table.cell>
                            @if ($row->isReplied())
                                <krikkit:badge color="green" size="xs">{{ __('dashboard.Replied') }}</krikkit:badge>
                            @elseif ($row->isUnread())
                                <krikkit:badge color="amber" size="xs">{{ __('dashboard.Unread') }}</krikkit:badge>
                            @else
                                <krikkit:badge size="xs">{{ __('dashboard.Open') }}</krikkit:badge>
                            @endif
                        </krikkit:table.cell>
                        <krikkit:table.cell>{{ $row->created_at?->timezone(config('app.timezone'))->format('Y-m-d H:i') }}</krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <krikkit:button size="sm" variant="ghost" :href="route('dashboard.contacts.show', $row)" :navigate="true">
                                {{ __('dashboard.Open') }}
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
</div>
