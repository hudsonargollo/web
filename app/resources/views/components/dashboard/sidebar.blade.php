@php
    use App\Support\Navigation\WorkspaceNav;

    $user = auth()->user();
    $items = collect(WorkspaceNav::visibleGroups($user))->flatten(1);
@endphp

<aside
    id="krikkit-dashboard-nav"
    class="fixed inset-y-0 left-0 z-50 flex h-dvh w-60 shrink-0 flex-col border-r border-krikkit-line/50 bg-krikkit-canvas transition-[translate] duration-200 ease-out max-lg:-translate-x-full lg:static lg:z-auto lg:h-full lg:translate-none"
    x-bind:style="! desktop && navOpen ? 'translate: 0' : null"
    x-bind:inert="! desktop && ! navOpen"
    x-bind:aria-hidden="(! desktop && ! navOpen).toString()"
>
    <div class="flex items-center gap-2 px-3.5 pb-5 pt-4">
        <a href="{{ route('dashboard.home') }}" wire:navigate class="group flex min-w-0 flex-1 items-center gap-2.5">
            <x-site.mark />
            <span class="min-w-0 truncate text-sm font-semibold tracking-tight text-krikkit-fg">
                {{ app(\App\Support\Site\SiteSettings::class)->name() }}
            </span>
        </a>
        <button
            type="button"
            class="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-krikkit-fg-soft transition hover:bg-krikkit-soft lg:hidden"
            x-on:click="closeNav()"
            aria-label="{{ __('dashboard.Close navigation') }}"
        >
            <krikkit:icon name="x" class="size-4" />
        </button>
    </div>

    <nav class="krikkit-scroll-hover flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-6">
        @if ($items->isEmpty())
            <p class="px-2 text-sm text-krikkit-muted">{{ __('dashboard.No navigation available.') }}</p>
        @else
            <ul class="space-y-1">
                @foreach ($items as $item)
                    @php
                        $children = $item['children'] ?? [];
                        $hasChildren = count($children) > 0;
                        $childActive = collect($children)->contains(
                            fn (array $child) => WorkspaceNav::routeIsActive(
                                $child['route'],
                                $child['route_params'] ?? []
                            )
                        );
                        $parentActive = filled($item['route'])
                            && WorkspaceNav::routeIsActive($item['route'])
                            && ! $childActive;
                        $branchActive = $parentActive || $childActive;
                    @endphp
                    <li
                        @if ($hasChildren)
                            x-data="{ open: {{ $childActive ? 'true' : 'false' }} }"
                        @endif
                    >
                        @if ($hasChildren)
                            <button
                                type="button"
                                x-on:click="open = ! open"
                                :aria-expanded="open.toString()"
                                @class([
                                    'group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition',
                                    'bg-krikkit-soft text-krikkit-fg' => $branchActive,
                                    'text-krikkit-muted hover:bg-krikkit-soft hover:text-krikkit-fg' => ! $branchActive,
                                ])
                            >
                                <span @class([
                                    'flex size-4 shrink-0 items-center justify-center transition',
                                    'text-accent-content' => $branchActive,
                                    'text-krikkit-muted group-hover:text-accent-content' => ! $branchActive,
                                ])>
                                    <krikkit:icon :name="$item['icon']" class="size-4" />
                                </span>
                                <span class="min-w-0 flex-1 truncate text-left">{{ $item['label'] }}</span>
                                <span
                                    class="inline-flex shrink-0 text-krikkit-muted transition group-hover:text-krikkit-fg"
                                    :class="open ? 'rotate-90' : ''"
                                >
                                    <krikkit:icon name="chevron-right" class="size-3.5" />
                                </span>
                            </button>
                            <ul x-show="open" x-cloak class="mt-1 space-y-0.5 pl-8">
                                @foreach ($children as $child)
                                    @php
                                        $childParams = $child['route_params'] ?? [];
                                        $active = WorkspaceNav::routeIsActive($child['route'], $childParams);
                                    @endphp
                                    <li>
                                        <a
                                            href="{{ route($child['route'], $childParams) }}"
                                            wire:navigate
                                            @class([
                                                'block cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition',
                                                'text-krikkit-fg' => $active,
                                                'text-krikkit-muted hover:text-krikkit-fg' => ! $active,
                                            ])
                                        >
                                            {{ $child['label'] }}
                                        </a>
                                    </li>
                                @endforeach
                            </ul>
                        @else
                            @php
                                $active = filled($item['route']) && WorkspaceNav::routeIsActive($item['route']);
                            @endphp
                            <a
                                href="{{ route($item['route']) }}"
                                wire:navigate
                                @class([
                                    'group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition',
                                    'bg-krikkit-soft text-krikkit-fg' => $active,
                                    'text-krikkit-muted hover:bg-krikkit-soft hover:text-krikkit-fg' => ! $active,
                                ])
                            >
                                <span @class([
                                    'flex size-4 shrink-0 items-center justify-center transition',
                                    'text-accent-content' => $active,
                                    'text-krikkit-muted group-hover:text-accent-content' => ! $active,
                                ])>
                                    <krikkit:icon :name="$item['icon']" class="size-4" />
                                </span>
                                <span class="truncate">{{ $item['label'] }}</span>
                            </a>
                        @endif
                    </li>
                @endforeach
            </ul>
        @endif
    </nav>

    <div class="border-t border-krikkit-line p-3">
        <krikkit:dropdown position="top" width="full" class="w-full">
            <x-slot:trigger>
                <button
                    type="button"
                    class="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-krikkit-soft"
                    aria-haspopup="menu"
                    :aria-expanded="open.toString()"
                >
                    <krikkit:avatar :name="$user->name" :src="$user->avatarUrl()" size="xs" />
                    <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium text-krikkit-fg">{{ $user->name }}</span>
                        <span class="block truncate text-[11px] text-krikkit-muted">{{ $user->accessRole?->title ?? __('dashboard.Member') }}</span>
                    </span>
                    <span class="inline-flex shrink-0 text-krikkit-muted" :class="open ? 'rotate-180' : ''">
                        <krikkit:icon name="chevron-up" class="size-3.5" />
                    </span>
                </button>
            </x-slot:trigger>
            <x-slot:menu>
                @include('components.dashboard.accountMenu')
            </x-slot:menu>
        </krikkit:dropdown>
    </div>
</aside>
