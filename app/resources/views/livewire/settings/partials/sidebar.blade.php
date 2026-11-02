@php
    $user?->loadMissing('entitlement.plan');
    $account = [
        ['label' => __('settings.Profile'), 'route' => 'settings.profile', 'icon' => 'user', 'match' => ['settings.profile', 'settings.password', 'settings.two-factor']],
        ['label' => __('settings.General'), 'route' => 'settings.index', 'icon' => 'cog-6-tooth', 'match' => ['settings.index']],
        ['label' => __('settings.Applications'), 'route' => 'settings.applications', 'icon' => 'squares-2x2', 'match' => ['settings.applications']],
    ];
    $workspace = [
        ['label' => __('settings.Subscription'), 'route' => 'settings.subscription', 'icon' => 'credit-card', 'match' => ['settings.subscription']],
        ['label' => __('settings.Credits'), 'route' => 'settings.credits', 'icon' => 'banknotes', 'match' => ['settings.credits']],
        ['label' => __('settings.Usage'), 'route' => 'settings.usage', 'icon' => 'chart-bar', 'match' => ['settings.usage']],
    ];
    $planTitle = $user?->entitlement?->plan?->title ?: __('dashboard.Free');
@endphp

<aside
    id="krikkit-settings-nav"
    class="fixed inset-y-0 left-0 z-50 flex h-dvh w-[17.5rem] shrink-0 flex-col border-r border-krikkit-line/50 bg-krikkit-canvas max-lg:-translate-x-full lg:sticky lg:top-0 lg:z-auto lg:self-start lg:translate-none"
    x-bind:style="! desktop && navOpen ? 'translate: 0' : null"
    x-bind:inert="! desktop && ! navOpen"
    x-bind:aria-hidden="(! desktop && ! navOpen).toString()"
>
    <div class="flex items-center gap-3 px-5 pb-5 pt-4">
        <a href="{{ route('home') }}" wire:navigate class="flex min-w-0 flex-1 items-center gap-3">
            <x-site.mark />
            <span class="truncate text-base font-semibold tracking-tight text-krikkit-fg">{{ __('settings.Settings') }}</span>
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

    <nav class="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 pb-3 pt-1">
        <a
            href="{{ route('home') }}"
            wire:navigate
            x-on:click="closeNav()"
            class="mb-3 flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm text-krikkit-muted transition hover:text-krikkit-fg"
        >
            <krikkit:icon name="arrow-left" class="size-[18px]" />
            <span class="truncate">{{ __('settings.Back to home') }}</span>
        </a>

        <div class="mx-2.5 mb-4 border-t border-krikkit-line/60"></div>

        <p class="px-2.5 pb-2 text-xs font-medium text-krikkit-subtle">{{ __('settings.Account') }}</p>
        <ul class="space-y-0.5">
            @foreach ($account as $item)
                @php $active = request()->routeIs($item['match']); @endphp
                <li>
                    <a
                        href="{{ route($item['route']) }}"
                        wire:navigate
                        x-on:click="closeNav()"
                        @class([
                            'flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm transition',
                            'text-krikkit-fg' => $active,
                            'text-krikkit-muted hover:text-krikkit-fg' => ! $active,
                        ])
                    >
                        <krikkit:icon :name="$item['icon']" class="size-[18px]" />
                        <span class="truncate">{{ $item['label'] }}</span>
                    </a>
                </li>
            @endforeach
        </ul>

        <div class="mx-2.5 mb-4 mt-5 border-t border-krikkit-line/60"></div>

        <p class="px-2.5 pb-2 text-xs font-medium text-krikkit-subtle">{{ __('settings.Workspace') }}</p>
        <ul class="space-y-0.5">
            @foreach ($workspace as $item)
                @php $active = request()->routeIs($item['match']); @endphp
                <li>
                    <a
                        href="{{ route($item['route']) }}"
                        wire:navigate
                        x-on:click="closeNav()"
                        @class([
                            'flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm transition',
                            'text-krikkit-fg' => $active,
                            'text-krikkit-muted hover:text-krikkit-fg' => ! $active,
                        ])
                    >
                        <krikkit:icon :name="$item['icon']" class="size-[18px]" />
                        <span class="truncate">{{ $item['label'] }}</span>
                    </a>
                </li>
            @endforeach
        </ul>
    </nav>

    @if ($user)
        <div class="border-t border-krikkit-line px-3.5 py-3.5">
            <a
                href="{{ route('settings.profile') }}"
                wire:navigate
                x-on:click="closeNav()"
                class="flex w-full items-center gap-3 text-left"
            >
                <krikkit:avatar :name="$user->name" :src="$user->avatarUrl()" size="sm" :circle="false" />
                <span class="min-w-0 flex-1">
                    <span class="flex items-center gap-2">
                        <span class="truncate text-sm font-medium text-krikkit-fg">{{ $user->name ?: $user->email }}</span>
                        <span class="shrink-0 text-[11px] uppercase tracking-[0.12em] text-krikkit-subtle">{{ $planTitle }}</span>
                    </span>
                    <span class="mt-0.5 block truncate text-xs text-krikkit-muted">{{ $user->email }}</span>
                </span>
            </a>
        </div>
    @endif
</aside>
