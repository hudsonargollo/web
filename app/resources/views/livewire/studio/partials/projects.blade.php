@php
    $shelves = [
        [
            'id' => 'opened',
            'title' => __('studio.Recently opened'),
            'projects' => $openedProjects,
            'stamp' => 'opened_at',
        ],
        [
            'id' => 'edited',
            'title' => __('studio.Recently edited'),
            'projects' => $editedProjects,
            'stamp' => 'updated_at',
        ],
    ];
@endphp

<section class="scroll-mt-8 px-4 pb-16 sm:px-6 lg:px-10">
    <div class="space-y-10">
        @foreach ($shelves as $shelf)
            @if ($shelf['projects']->isEmpty())
                @continue
            @endif
            <div id="{{ $shelf['id'] }}" class="scroll-mt-8">
                <div class="flex items-center justify-between gap-3">
                    <h2 class="text-sm font-semibold text-krikkit-fg">{{ $shelf['title'] }}</h2>
                    @if (empty($paginateShelves))
                        <a
                            href="{{ route('projects') }}#{{ $shelf['id'] }}"
                            class="inline-flex items-center gap-0.5 text-xs font-medium text-krikkit-muted transition hover:text-krikkit-fg"
                        >
                            {{ __('studio.See all') }}
                            <krikkit:icon name="chevron-right" class="size-3.5 shrink-0" />
                        </a>
                    @endif
                </div>

                <div
                    wire:loading.remove.delay
                    wire:target="query"
                    class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    @foreach ($shelf['projects'] as $project)
                        @include('livewire.studio.partials.projectCard', [
                            'project' => $project,
                            'stamp' => $project->{$shelf['stamp']},
                            'canExport' => $canExport,
                        ])
                    @endforeach
                </div>

                <div
                    wire:loading.delay.class.remove="hidden"
                    wire:target="query"
                    class="mt-4 hidden grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    @for ($slot = 0; $slot < 3; $slot++)
                        @include('livewire.studio.partials.projectSkeleton')
                    @endfor
                </div>

                @if (! empty($paginateShelves) && (($shelf['id'] === 'opened' && ! empty($openedHasMore)) || ($shelf['id'] === 'edited' && ! empty($editedHasMore))))
                    @php
                        $moreMethod = $shelf['id'] === 'opened' ? 'loadMoreOpened' : 'loadMoreEdited';
                    @endphp
                    <div
                        class="mt-6 flex min-h-10 items-center justify-center"
                        wire:intersect.once.margin.160px="{{ $moreMethod }}"
                    >
                        <span
                            wire:loading
                            wire:target="{{ $moreMethod }}"
                            class="inline-flex items-center justify-center text-krikkit-muted"
                            role="status"
                            aria-live="polite"
                        >
                            <svg class="size-5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                            </svg>
                            <span class="sr-only">{{ __('studio.Loading more projects') }}</span>
                        </span>
                    </div>
                @endif
            </div>
        @endforeach
    </div>
</section>
