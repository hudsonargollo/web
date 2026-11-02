<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Blog') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Write and publish posts for the public blog.') }}</p>
        </div>
        @allows('blog.compose')
            <krikkit:button
                href="{{ route('dashboard.blog.create') }}"
                variant="ghost"
                square
                size="sm"
                aria-label="{{ __('dashboard.New post') }}"
            >
                <krikkit:icon name="plus" class="size-4" />
            </krikkit:button>
        @endallows
    </div>

    @if ($posts->isEmpty())
        <p class="text-sm text-krikkit-muted">{{ __('dashboard.No posts yet.') }}</p>
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
                @foreach ($posts as $post)
                    <krikkit:table.row>
                        <krikkit:table.cell>
                            <p class="truncate text-xs font-medium text-krikkit-fg">{{ $post->title }}</p>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $post->slug }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            @if ($post->isReleased())
                                <krikkit:badge color="teal" size="xs">{{ __('dashboard.Published') }}</krikkit:badge>
                            @else
                                <krikkit:badge size="xs">{{ __('dashboard.Draft') }}</krikkit:badge>
                            @endif
                        </krikkit:table.cell>
                        <krikkit:table.cell>
                            <span class="text-krikkit-muted">{{ $post->updated_at?->toFormattedDateString() }}</span>
                        </krikkit:table.cell>
                        <krikkit:table.cell align="right">
                            <div class="inline-flex items-center gap-1">
                                @allows('blog.revise')
                                    <krikkit:button
                                        href="{{ route('dashboard.blog.edit', $post) }}"
                                        variant="ghost"
                                        square
                                        size="sm"
                                        aria-label="{{ __('dashboard.Edit') }}"
                                    >
                                        <krikkit:icon name="pencil" class="size-4" />
                                    </krikkit:button>
                                @endallows
                                @allows('blog.retire')
                                    <krikkit:button
                                        type="button"
                                        variant="ghost"
                                        square
                                        size="sm"
                                        wire:click="askRetire('{{ $post->public_id }}')"
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

    <krikkit:confirm name="retire-post" :title="__('dashboard.Retire post')" :copy="__('dashboard.Retire this post?')">
        <x-slot:action>
            <krikkit:button type="button" variant="danger" wire:click="confirmPending">
                {{ __('dashboard.Retire') }}
            </krikkit:button>
        </x-slot:action>
    </krikkit:confirm>
</div>
