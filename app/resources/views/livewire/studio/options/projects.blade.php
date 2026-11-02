<x-studio.frame :user="$user" :site="$site" :plan-title="$planTitle" :pack-offer="$packOffer">
    <section class="px-4 pb-6 pt-8 sm:px-6 sm:pt-10 lg:px-10">
        <div class="flex flex-col gap-6">
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div class="min-w-0">
                    <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg sm:text-3xl">
                        {{ __('studio.Projects') }}
                    </h1>
                    @if (! $isEmpty)
                        <p class="mt-1 text-sm text-krikkit-muted">
                            {{ __('studio.Every Lab project in this workspace.') }}
                        </p>
                    @endif
                </div>
                @if (! $isEmpty)
                    <krikkit:button href="{{ route('lab') }}" size="sm" :navigate="false">
                        <krikkit:icon name="plus" class="size-4" />
                        {{ __('studio.New project') }}
                    </krikkit:button>
                @endif
            </div>

            @if (! $isEmpty || filled($query))
                <div>
                    <label class="sr-only" for="studio-projects-search">{{ __('studio.Search projects…') }}</label>
                    <div class="flex h-10 items-center gap-2 rounded-lg border border-krikkit-line bg-krikkit-surface px-3">
                        <krikkit:icon name="search" class="size-4 text-krikkit-subtle" />
                        <input
                            id="studio-projects-search"
                            type="search"
                            wire:model.live.debounce.250ms="query"
                            placeholder="{{ __('studio.Search projects…') }}"
                            class="min-w-0 flex-1 bg-transparent text-[13px] text-krikkit-fg outline-none placeholder:text-krikkit-subtle"
                        >
                    </div>
                </div>
            @endif
        </div>
    </section>

    @if ($isEmpty)
        <div class="flex min-h-[min(28rem,calc(100dvh-18rem))] flex-1 items-center justify-center px-4">
            <krikkit:empty
                :title="filled($query) ? __('studio.No matching projects') : __('studio.No projects')"
                :copy="filled($query) ? __('studio.Try a different search.') : __('studio.Create one to start building in Lab.')"
            >
                <krikkit:button href="{{ route('lab') }}" :navigate="false">
                    <krikkit:icon name="plus" class="size-4" />
                    {{ __('studio.New project') }}
                </krikkit:button>
            </krikkit:empty>
        </div>
    @else
        @include('livewire.studio.partials.projects')
    @endif

    @include('livewire.studio.partials.projectModals')
</x-studio.frame>
