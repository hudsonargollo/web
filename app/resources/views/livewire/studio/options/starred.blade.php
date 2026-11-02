<x-studio.frame :user="$user" :site="$site" :plan-title="$planTitle" :pack-offer="$packOffer">
    <section class="px-4 pb-6 pt-8 sm:px-6 sm:pt-10 lg:px-10">
        <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg sm:text-3xl">
                {{ __('studio.Starred') }}
            </h1>
            @if ($starredProjects->isNotEmpty())
                <p class="text-sm text-krikkit-muted">
                    {{ __('studio.Projects you marked as favorites.') }}
                </p>
            @endif
        </div>
    </section>

    @if ($starredProjects->isEmpty())
        <div class="flex min-h-[min(28rem,calc(100dvh-18rem))] flex-1 items-center justify-center px-4">
            <krikkit:empty
                :title="__('studio.No starred projects')"
                :copy="__('studio.Hover a project preview and tap the star to save it here.')"
            >
                <krikkit:button href="{{ route('projects') }}" wire:navigate>
                    {{ __('studio.Browse projects') }}
                </krikkit:button>
            </krikkit:empty>
        </div>
    @else
        <section class="px-4 pb-16 sm:px-6 lg:px-10">
            <div>
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    @foreach ($starredProjects as $project)
                        @include('livewire.studio.partials.projectCard', [
                            'project' => $project,
                            'stamp' => $project->starred_at,
                            'canExport' => $canExport,
                        ])
                    @endforeach
                </div>
            </div>
        </section>
    @endif

    @include('livewire.studio.partials.projectModals')
</x-studio.frame>
