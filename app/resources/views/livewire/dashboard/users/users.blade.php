<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Users') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.People in this workspace and their access role.') }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
            <div
                x-data="{
                    open: false,
                    expand() {
                        this.open = true
                        this.$nextTick(() => this.$refs.query?.focus())
                    },
                    collapse() {
                        this.$refs.query?.blur()
                        this.open = false
                        if ($wire.search !== '') {
                            $wire.set('search', '')
                        }
                    },
                }"
                x-on:click.outside="if (open) collapse()"
                x-on:keydown.escape.window="if (open) collapse()"
                class="flex items-center"
            >
                <div
                    class="flex h-8 items-center overflow-hidden rounded-full border transition-[width,border-color,background-color] duration-300 ease-out"
                    :class="open
                        ? 'w-56 border-krikkit-line/50 bg-krikkit-surface'
                        : 'w-8 border-transparent bg-transparent'"
                >
                    <button
                        type="button"
                        class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-krikkit-fg-soft transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                        x-on:click.stop="open ? $refs.query?.focus() : expand()"
                        aria-label="{{ __('dashboard.Search') }}"
                        title="{{ __('dashboard.Search') }}"
                    >
                        <krikkit:icon name="search" class="size-4" />
                    </button>
                    <input
                        x-ref="query"
                        type="text"
                        inputmode="search"
                        autocomplete="off"
                        wire:model.live.debounce.250ms="search"
                        placeholder="{{ __('dashboard.Search…') }}"
                        class="h-8 min-w-0 flex-1 bg-transparent pr-2 text-sm leading-5 text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                        :tabindex="open ? 0 : -1"
                        x-bind:aria-hidden="(! open).toString()"
                    />
                    <button
                        type="button"
                        class="mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-krikkit-subtle transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                        x-show="open"
                        x-cloak
                        x-on:click.stop="collapse()"
                        aria-label="{{ __('dashboard.Clear') }}"
                        title="{{ __('dashboard.Clear') }}"
                    >
                        <krikkit:icon name="x" class="size-3.5" />
                    </button>
                </div>
            </div>

            @if ($directoryHasUsers)
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
                        @if ($canAdvancedExport)
                            <krikkit:dropdown.item wire:click="export('tsv')" x-on:click="open = false">
                                {{ __('dashboard.TSV') }}
                            </krikkit:dropdown.item>
                            <krikkit:dropdown.item wire:click="export('json')" x-on:click="open = false">
                                {{ __('dashboard.JSON') }}
                            </krikkit:dropdown.item>
                        @endif
                    </x-slot:menu>
                </krikkit:dropdown>
            @endif
            @allows('users.compose')
                <krikkit:button
                    href="{{ route('dashboard.users.create') }}"
                    variant="ghost"
                    square
                    size="sm"
                    aria-label="{{ __('dashboard.New user') }}"
                    title="{{ __('dashboard.New user') }}"
                >
                    <krikkit:icon name="plus" class="size-4" />
                </krikkit:button>
            @endallows
        </div>
    </div>

    @if ($users->isEmpty())
        <p class="text-sm text-krikkit-muted">
            {{ filled($search) ? __('dashboard.No results.') : __('dashboard.No users yet.') }}
        </p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Username') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Email') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Role') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Pack') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Country') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($users as $user)
                    @php
                        $status = $user->statusEnum();
                        $statusColor = match ($status) {
                            \App\Enums\UserStatus::Active => 'teal',
                            \App\Enums\UserStatus::Invited => 'amber',
                            \App\Enums\UserStatus::Disabled => 'red',
                        };
                        $countryLabel = \App\Support\Geography\Countries::label($user->country);
                    @endphp
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <div class="min-w-0">
                                <p class="truncate text-xs font-medium text-krikkit-fg">{{ $user->name }}</p>
                                @if (filled($user->username))
                                    <p class="truncate text-[11px] text-krikkit-muted">{{ $user->username }}</p>
                                @endif
                            </div>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-fg-soft">{{ $user->email }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            {{ $user->accessRole?->title ?? __('dashboard.Unassigned') }}
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-fg-soft">{{ $user->entitlement?->plan?->title ?? __('dashboard.Free') }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <krikkit:badge :color="$statusColor" size="xs">{{ $status->label() }}</krikkit:badge>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $countryLabel ?: '—' }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            @allows('users.revise')
                                <krikkit:button
                                    href="{{ route('dashboard.users.edit', $user) }}"
                                    variant="ghost"
                                    square
                                    size="sm"
                                    aria-label="{{ __('dashboard.Edit') }}"
                                    title="{{ __('dashboard.Edit') }}"
                                >
                                    <krikkit:icon name="pencil" class="size-4" />
                                </krikkit:button>
                            @endallows
                        </krikkit:table.cell>
                    </krikkit:table.row>
                @endforeach
            </krikkit:table.rows>
        </krikkit:table>
    @endif
</div>
