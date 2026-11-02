@props([
    'project',
    'stamp' => null,
    'canExport' => false,
])

@php
    $when = $stamp ?? $project->updated_at;
    $starred = $project->isStarred();
    $coverUrl = $project->coverUrl();
    $openHref = route('lab.show', $project);
    $exportHref = route('projects.export', $project);
    $menuPanel = 'rounded-xl border border-krikkit-line bg-[color-mix(in_oklab,var(--color-krikkit-canvas)_55%,var(--color-krikkit-surface)_45%)] p-1';
    $menuItem = 'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-krikkit-fg-soft transition hover:bg-krikkit-soft hover:text-krikkit-fg';
    $menuItemDanger = 'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40';
@endphp

<article class="group/card min-w-0" wire:key="studio-project-{{ $project->uuid }}">
    <div class="group/thumb relative">
        <a href="{{ $openHref }}" class="block">
            <div class="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-krikkit-line bg-krikkit-surface transition group-hover/thumb:border-krikkit-muted/50 group-hover/thumb:bg-krikkit-soft">
                @if ($coverUrl)
                    <img
                        src="{{ $coverUrl }}"
                        alt="{{ $project->title ?: __('studio.Untitled') }}"
                        class="size-full object-cover object-top"
                        loading="lazy"
                        decoding="async"
                    >
                @else
                    <x-site.mark class="opacity-40" />
                @endif
            </div>
        </a>
        <button
            type="button"
            wire:click="toggleStar('{{ $project->uuid }}')"
            @class([
                'absolute right-2.5 top-2.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border transition',
                'border-transparent bg-krikkit-canvas/90 text-rose-400 opacity-100' => $starred,
                'border-krikkit-line bg-krikkit-canvas/90 text-krikkit-muted opacity-0 group-hover/thumb:opacity-100 hover:text-rose-400' => ! $starred,
            ])
            aria-label="{{ $starred ? __('studio.Unstar project') : __('studio.Star project') }}"
            aria-pressed="{{ $starred ? 'true' : 'false' }}"
        >
            <krikkit:icon name="star" :variant="$starred ? 'solid' : 'outline'" class="size-4" />
        </button>
    </div>

    <div class="mt-2.5 flex items-start gap-2">
        <a href="{{ $openHref }}" class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-krikkit-fg">
                {{ $project->title ?: __('studio.Untitled') }}
            </p>
            <p class="mt-0.5 text-[11px] text-krikkit-muted">
                {{ $when?->diffForHumans() }}
            </p>
        </a>

        <div
            class="relative shrink-0"
            x-data="studioProjectMenu"
            @keydown.escape.window="close()"
            @click.outside="close()"
        >
            <button
                type="button"
                x-ref="trigger"
                class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-0 text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg"
                aria-label="{{ __('studio.Project actions') }}"
                aria-haspopup="menu"
                x-bind:aria-expanded="open.toString()"
                @click="toggle()"
            >
                <krikkit:icon name="dots" class="size-4" />
            </button>

            <div
                x-ref="menu"
                x-cloak
                x-show="open"
                x-transition
                class="absolute right-0 z-50 min-w-[15rem] {{ $menuPanel }}"
                x-bind:class="place === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'"
                role="menu"
            >
                <a href="{{ $openHref }}" role="menuitem" class="{{ $menuItem }}">
                    <krikkit:icon name="arrow-top-right-on-square" class="size-3.5 shrink-0" />
                    <span>{{ __('studio.Open') }}</span>
                </a>
                <button type="button" role="menuitem" class="{{ $menuItem }}" wire:click="askRename('{{ $project->uuid }}')" @click="close()">
                    <krikkit:icon name="pencil" class="size-3.5 shrink-0" />
                    <span>{{ __('studio.Rename') }}</span>
                </button>
                <button type="button" role="menuitem" class="{{ $menuItem }}" wire:click="duplicateProject('{{ $project->uuid }}')" @click="close()">
                    <krikkit:icon name="document-duplicate" class="size-3.5 shrink-0" />
                    <span>{{ __('studio.Duplicate') }}</span>
                </button>
                <button
                    type="button"
                    role="menuitem"
                    class="{{ $menuItem }}"
                    x-on:click="
                        navigator.clipboard.writeText(@js($openHref))
                        close()
                    "
                >
                    <krikkit:icon name="link" class="size-3.5 shrink-0" />
                    <span>{{ __('studio.Copy link') }}</span>
                </button>
                <button type="button" role="menuitem" class="{{ $menuItem }}" wire:click="toggleStar('{{ $project->uuid }}')" @click="close()">
                    <krikkit:icon name="star" class="size-3.5 shrink-0" />
                    <span>{{ $starred ? __('studio.Unstar project') : __('studio.Star project') }}</span>
                </button>

                <div
                    class="relative"
                    @mouseenter="showExport()"
                    @mouseleave="exportOpen = false"
                >
                    @if ($canExport)
                        <button
                            type="button"
                            role="menuitem"
                            class="{{ $menuItem }} justify-between"
                            @click="exportOpen ? (exportOpen = false) : showExport()"
                            aria-haspopup="menu"
                            x-bind:aria-expanded="exportOpen.toString()"
                        >
                            <span class="flex items-center gap-2">
                                <krikkit:icon name="arrow-down-tray" class="size-3.5 shrink-0" />
                                <span>{{ __('studio.Export') }}</span>
                            </span>
                            <krikkit:icon name="chevron-right" class="size-3.5 shrink-0 text-krikkit-subtle" x-show="exportSide === 'right'" />
                            <krikkit:icon name="chevron-left" class="size-3.5 shrink-0 text-krikkit-subtle" x-show="exportSide === 'left'" x-cloak />
                        </button>
                        <div
                            x-cloak
                            x-show="exportOpen"
                            class="absolute top-0 z-50 flex"
                            x-bind:class="exportSide === 'right' ? 'left-full pl-1.5' : 'right-full pr-1.5'"
                        >
                            <div role="menu" class="min-w-[11.5rem] {{ $menuPanel }}">
                                <a href="{{ $exportHref }}" role="menuitem" class="{{ $menuItem }}">
                                    <span>{{ __('studio.Download ZIP') }}</span>
                                </a>
                            </div>
                        </div>
                    @else
                        <button
                            type="button"
                            role="menuitem"
                            disabled
                            class="flex w-full cursor-not-allowed items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-krikkit-subtle opacity-40"
                            aria-disabled="true"
                            title="{{ __('studio.Export is locked on your pack.') }}"
                        >
                            <span class="flex items-center gap-2">
                                <krikkit:icon name="arrow-down-tray" class="size-3.5 shrink-0" />
                                <span>{{ __('studio.Export') }}</span>
                            </span>
                            <krikkit:icon name="chevron-right" class="size-3.5 shrink-0" />
                        </button>
                    @endif
                </div>

                <div class="my-1 border-t border-krikkit-line/60" role="separator"></div>

                <button type="button" role="menuitem" class="{{ $menuItemDanger }}" wire:click="askDelete('{{ $project->uuid }}')" @click="close()">
                    <krikkit:icon name="trash" class="size-3.5 shrink-0" />
                    <span>{{ __('studio.Delete') }}</span>
                </button>
            </div>
        </div>
    </div>
</article>
