@props([
    'breadcrumbs' => [],
])

<header class="shrink-0 border-b border-krikkit-line/50 bg-krikkit-canvas">
    <div class="flex min-h-14 items-center justify-between gap-3 px-4 py-2 sm:px-5 lg:px-8">
        <div class="flex min-w-0 flex-1 items-center gap-2">
            <button
                type="button"
                class="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-krikkit-fg-soft transition hover:bg-krikkit-soft lg:hidden"
                x-on:click="toggleNav()"
                x-bind:aria-expanded="navOpen.toString()"
                aria-controls="krikkit-dashboard-nav"
                aria-label="{{ __('dashboard.Open navigation') }}"
            >
                <krikkit:icon name="bars-3" class="size-5" />
            </button>

            <div class="min-w-0 flex-1">
                @if (filled($breadcrumbs))
                    <krikkit:breadcrumbs>
                        @foreach ($breadcrumbs as $crumb)
                            <krikkit:breadcrumbs.item
                                :href="$crumb['href'] ?? null"
                                :current="(bool) ($crumb['current'] ?? false)"
                            >
                                {{ $crumb['label'] }}
                            </krikkit:breadcrumbs.item>
                        @endforeach
                    </krikkit:breadcrumbs>
                @else
                    <a href="{{ route('dashboard.home') }}" wire:navigate class="flex items-center gap-2 lg:hidden">
                        <span class="truncate text-sm font-semibold tracking-tight text-krikkit-fg">
                            {{ app(\App\Support\Site\SiteSettings::class)->name() }}
                        </span>
                    </a>
                @endif
            </div>
        </div>

        <div class="flex shrink-0 items-center gap-1 sm:gap-2">
            <krikkit:button
                type="button"
                variant="ghost"
                size="sm"
                class="text-krikkit-muted"
                x-on:click="$dispatch('krikkit-command-open', 'command')"
                aria-label="{{ __('dashboard.Search') }}"
            >
                <krikkit:icon name="magnifying-glass" class="size-4" />
                <span class="hidden text-xs text-krikkit-subtle sm:inline">⌘K</span>
            </krikkit:button>
        </div>
    </div>
</header>
