<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Pages') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Standalone public pages with their own URL.') }}</p>
        </div>
        @allows('pages.compose')
            <krikkit:button
                href="{{ route('dashboard.pages.create') }}"
                variant="ghost"
                square
                size="sm"
                aria-label="{{ __('dashboard.New page') }}"
            >
                <krikkit:icon name="plus" class="size-4" />
            </krikkit:button>
        @endallows
    </div>

    @if ($pages->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No pages yet.') }}</p>
    @else
        <krikkit:table>
            <krikkit:table.columns>
                <krikkit:table.column>{{ __('dashboard.Title') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Slug') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Status') }}</krikkit:table.column>
                <krikkit:table.column>{{ __('dashboard.Last updated') }}</krikkit:table.column>
                <krikkit:table.column align="right"></krikkit:table.column>
            </krikkit:table.columns>
            <krikkit:table.rows>
                @foreach ($pages as $page)
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <p class="truncate text-xs font-medium text-krikkit-fg">{{ $page->title }}</p>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $page->slug }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            @if ($page->isReleased())
                                <krikkit:badge color="teal" size="xs">{{ __('dashboard.Published') }}</krikkit:badge>
                            @else
                                <krikkit:badge size="xs">{{ __('dashboard.Draft') }}</krikkit:badge>
                            @endif
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $page->updated_at?->toFormattedDateString() }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <div class="inline-flex items-center gap-1">
                                @allows('pages.revise')
                                    <krikkit:button
                                        href="{{ route('dashboard.pages.edit', $page) }}"
                                        variant="ghost"
                                        square
                                        size="sm"
                                        aria-label="{{ __('dashboard.Edit') }}"
                                    >
                                        <krikkit:icon name="pencil" class="size-4" />
                                    </krikkit:button>
                                @endallows
                                @allows('pages.retire')
                                    <krikkit:button
                                        type="button"
                                        variant="ghost"
                                        square
                                        size="sm"
                                        wire:click="askRetire('{{ $page->public_id }}')"
                                        aria-label="{{ __('dashboard.Retire') }}"
                                    >
                                        <krikkit:icon name="trash" class="size-4" />
                                    </krikkit:button>
                                @endallows
                            </div>
                        </krikkit:table.cell>
                    </krikkit:table.row>
                @endforeach
            </krikkit:table.rows>
        </krikkit:table>
    @endif

    <krikkit:confirm name="retire-page" :title="__('dashboard.Retire page')" :copy="__('dashboard.Retire this page?')">
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="confirmPending">
                {{ __('dashboard.Retire') }}
            </krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</div>
