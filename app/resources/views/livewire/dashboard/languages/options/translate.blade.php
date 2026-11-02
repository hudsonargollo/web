<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ $language->name }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Translate existing UI phrases.') }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
            <div
                x-data="{
                    open: @js(filled($search)),
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
                x-on:click.outside="if (open && ! $wire.search) collapse()"
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

            <krikkit:button
                type="button"
                variant="ghost"
                size="sm"
                wire:click="translatePage"
                wire:loading.attr="disabled"
                wire:target="translatePage"
                title="{{ $modelLabel ?: __('dashboard.Translate with AI') }}"
            >
                <span wire:loading.remove wire:target="translatePage">{{ __('dashboard.Translate with AI') }}</span>
                <span wire:loading wire:target="translatePage">{{ __('dashboard.Translating…') }}</span>
            </krikkit:button>
        </div>
    </div>

    <nav class="-mx-4 flex gap-1 overflow-x-auto border-b border-krikkit-line px-4 pb-px sm:-mx-5 sm:px-5 lg:mx-0 lg:overflow-visible lg:px-0" aria-label="{{ __('dashboard.Phrase group') }}">
        @foreach ($groups as $name)
            @php $active = $group === $name; @endphp
            <button
                type="button"
                wire:click="selectGroup('{{ $name }}')"
                @class([
                    '-mb-px shrink-0 border-b px-3 py-2 text-sm font-medium capitalize transition',
                    'border-krikkit-fg text-krikkit-fg' => $active,
                    'border-transparent text-krikkit-muted hover:text-krikkit-fg' => ! $active,
                ])
            >
                {{ $name }}
            </button>
        @endforeach
    </nav>

    @if ($rows === [])
        <p class="text-sm text-krikkit-muted">
            {{ filled($search) ? __('dashboard.No results.') : __('dashboard.No phrases on this page.') }}
        </p>
    @else
        <div class="space-y-5">
            @foreach ($rows as $index => $row)
                <krikkit:field :label="$row['key']">
                    <krikkit:input
                        size="md"
                        wire:model="rows.{{ $index }}.value"
                        :placeholder="$row['source']"
                    />
                    @if ($row['source'] !== $row['key'])
                        <x-slot:description>{{ $row['source'] }}</x-slot:description>
                    @endif
                </krikkit:field>
            @endforeach
        </div>
    @endif

    <div class="flex flex-wrap items-center justify-between gap-3">
        <krikkit:pagination
            class="min-w-0 flex-1"
            :current="$page"
            :last="$lastPage"
            :total="$total"
            :first-item="$firstItem"
            :last-item="$lastItem"
            goto="gotoPage"
        />

        <krikkit:button type="button" wire:click="save" wire:loading.attr="disabled" wire:target="save">
            {{ __('dashboard.Save changes') }}
        </krikkit:button>
    </div>
</div>
