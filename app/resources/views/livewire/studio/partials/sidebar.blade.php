@php
    $homeActive = request()->routeIs('home');
    $projectsActive = request()->routeIs('projects');
    $starredActive = request()->routeIs('starred');
    $labActive = request()->routeIs('lab', 'lab.show', 'lab.workspace');
@endphp

<aside
    id="krikkit-studio-nav"
    class="fixed inset-y-0 left-0 z-50 flex h-dvh w-[17.5rem] shrink-0 flex-col border-r border-krikkit-line/50 bg-krikkit-canvas max-lg:-translate-x-full lg:sticky lg:top-0 lg:z-auto lg:self-start lg:translate-none"
    x-bind:style="! desktop && navOpen ? 'translate: 0' : null"
    x-bind:inert="! desktop && ! navOpen"
    x-bind:aria-hidden="(! desktop && ! navOpen).toString()"
>
    <div class="flex items-center gap-3 px-5 pb-5 pt-4">
        <a href="{{ route('home') }}" wire:navigate class="flex min-w-0 flex-1 items-center gap-3">
            <x-site.mark />
            <span class="truncate text-base font-semibold tracking-tight text-krikkit-fg">{{ __('studio.Studio') }}</span>
        </a>
        <button
            type="button"
            class="inline-flex size-9 cursor-pointer items-center justify-center text-krikkit-subtle transition hover:text-krikkit-fg lg:hidden"
            x-on:click="closeNav()"
            aria-label="{{ __('studio.Close navigation') }}"
        >
            <krikkit:icon name="x" class="size-[18px]" />
        </button>
    </div>

    <div class="px-3.5 pt-3">
        <krikkit:button href="{{ route('lab') }}" class="w-full" :navigate="false">
            <krikkit:icon name="plus" class="size-[18px]" />
            {{ __('studio.New project') }}
        </krikkit:button>
    </div>

    <nav class="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 pb-3 pt-4">
        <ul class="space-y-0.5">
            <li>
                <a
                    href="{{ route('home') }}"
                    wire:navigate
                    x-on:click="closeNav()"
                    @class([
                        'flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm transition',
                        'text-krikkit-fg' => $homeActive,
                        'text-krikkit-muted hover:text-krikkit-fg' => ! $homeActive,
                    ])
                >
                    <krikkit:icon name="home" class="size-[18px]" />
                    <span class="truncate">{{ __('studio.Home') }}</span>
                </a>
            </li>
            <li>
                <a
                    href="{{ route('projects') }}"
                    wire:navigate
                    x-on:click="closeNav()"
                    @class([
                        'flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm transition',
                        'text-krikkit-fg' => $projectsActive,
                        'text-krikkit-muted hover:text-krikkit-fg' => ! $projectsActive,
                    ])
                >
                    <krikkit:icon name="folder" class="size-[18px]" />
                    <span class="truncate">{{ __('studio.Projects') }}</span>
                </a>
            </li>
            <li>
                <a
                    href="{{ route('starred') }}"
                    wire:navigate
                    x-on:click="closeNav()"
                    @class([
                        'flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm transition',
                        'text-krikkit-fg' => $starredActive,
                        'text-krikkit-muted hover:text-krikkit-fg' => ! $starredActive,
                    ])
                >
                    <krikkit:icon name="star" class="size-[18px]" />
                    <span class="truncate">{{ __('studio.Starred') }}</span>
                </a>
            </li>
            <li>
                <a
                    href="{{ route('lab') }}"
                    x-on:click="closeNav()"
                    @class([
                        'flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm transition',
                        'text-krikkit-fg' => $labActive,
                        'text-krikkit-muted hover:text-krikkit-fg' => ! $labActive,
                    ])
                >
                    <krikkit:icon name="lab" class="size-[18px]" />
                    <span class="truncate">{{ __('messages.Lab') }}</span>
                </a>
            </li>
        </ul>
    </nav>

    @if ($packOffer)
        <div class="relative z-10 overflow-visible px-3.5 pb-3">
            @include('livewire.studio.partials.pack')
        </div>
    @endif

    <div class="border-t border-krikkit-line px-3.5 py-3.5">
        <krikkit:dropdown position="top" width="full" class="w-full">
            <x-slot:trigger>
                <button
                    type="button"
                    class="flex w-full cursor-pointer items-center gap-3 text-left"
                    aria-haspopup="menu"
                    :aria-expanded="open.toString()"
                >
                    <krikkit:avatar :name="$user->name" :src="$user->avatarUrl()" size="sm" :circle="false" />
                    <span class="min-w-0 flex-1">
                        <span class="flex items-center gap-2">
                            <span class="truncate text-sm font-medium text-krikkit-fg">{{ $user->name ?: $user->email }}</span>
                            <span class="shrink-0 text-[11px] uppercase tracking-[0.12em] text-krikkit-subtle">{{ $planTitle }}</span>
                        </span>
                        <span class="mt-0.5 block truncate text-xs text-krikkit-muted">{{ $user->email }}</span>
                    </span>
                </button>
            </x-slot:trigger>
            <x-slot:menu>
                @include('components.studio.accountMenu')
            </x-slot:menu>
        </krikkit:dropdown>
    </div>
</aside>
