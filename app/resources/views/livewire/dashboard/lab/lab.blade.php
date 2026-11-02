<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="flex items-center gap-2 text-lg font-semibold tracking-tight text-krikkit-fg">
                <krikkit:icon name="lab" class="size-5" />
                {{ __('dashboard.Lab') }}
            </h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Every user project, with credits spent on each.') }}</p>
        </div>
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
    </div>

    @if ($projects->isEmpty())
        <p class="text-sm text-krikkit-muted">
            {{ filled($search) ? __('dashboard.No results.') : __('dashboard.No Lab projects yet.') }}
        </p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Project') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Owner') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Stack') }}</krikkit:table.column>
                <krikkit:table.column align="right">{{ __('dashboard.Credits') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Updated') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($projects as $project)
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <a href="{{ route('dashboard.lab.show', $project) }}" wire:navigate class="min-w-0 block">
                                <p class="truncate text-xs font-medium text-krikkit-fg">
                                    {{ $project->title ?: __('dashboard.Untitled') }}
                                </p>
                                <p class="mt-0.5 text-[11px] text-krikkit-muted">
                                    {{ $project->messages_count }} {{ __('dashboard.Messages') }}
                                    @if ($project->isFrozen())
                                        · {{ __('dashboard.Frozen') }}
                                    @endif
                                </p>
                            </a>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            @if ($project->user)
                                <div class="min-w-0">
                                    <p class="truncate text-xs text-krikkit-fg">{{ $project->user->name }}</p>
                                    <p class="truncate text-[11px] text-krikkit-muted">{{ $project->user->email }}</p>
                                </div>
                            @else
                                <span class="text-krikkit-muted">—</span>
                            @endif
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-xs text-krikkit-muted">{{ $project->stack ?: '—' }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <span class="tabular-nums text-krikkit-fg">{{ number_format((int) $project->credits_spent) }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $project->updated_at?->diffForHumans() }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <krikkit:button
                                href="{{ route('lab.show', $project) }}"
                                variant="ghost"
                                square
                                size="sm"
                                aria-label="{{ __('dashboard.Open in Lab') }}"
                                title="{{ __('dashboard.Open in Lab') }}"
                            >
                                <krikkit:icon name="lab" class="size-4" />
                            </krikkit:button>
                        </krikkit:table.cell>
                    </krikkit:table.row>
                @endforeach
            </krikkit:table.rows>
        </krikkit:table>
    @endif
</div>
