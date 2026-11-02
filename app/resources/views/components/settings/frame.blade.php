@props([
    'section' => 'general',
])

@php
    $user = auth()->user();
@endphp

<div
    class="flex min-h-screen bg-krikkit-canvas"
    x-data="{
        navOpen: false,
        desktop: false,
        init() {
            const mq = window.matchMedia('(min-width: 1024px)')
            const sync = () => {
                this.desktop = mq.matches
                if (this.desktop) this.navOpen = false
            }
            sync()
            mq.addEventListener('change', sync)
        },
        openNav() { this.navOpen = true },
        closeNav() { this.navOpen = false },
        toggleNav() { this.navOpen = ! this.navOpen },
    }"
    x-on:keydown.escape.window="if (navOpen) closeNav()"
>
    <div
        x-cloak
        x-show="navOpen"
        x-transition.opacity.duration.200ms
        class="fixed inset-0 z-40 bg-black/40 lg:hidden"
        x-on:click="closeNav()"
    ></div>

    @include('livewire.settings.partials.sidebar', ['section' => $section, 'user' => $user])

    <div class="relative flex min-w-0 flex-1 flex-col bg-krikkit-canvas">
        <header class="relative z-10 flex min-h-14 items-center gap-3 bg-transparent px-4 py-2 lg:hidden">
            <button
                type="button"
                class="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-krikkit-fg-soft transition hover:bg-krikkit-soft"
                x-on:click="toggleNav()"
                x-bind:aria-expanded="navOpen.toString()"
                aria-controls="krikkit-settings-nav"
                aria-label="{{ __('studio.Open navigation') }}"
            >
                <krikkit:icon name="bars-3" class="size-5" />
            </button>
            <span class="truncate text-sm font-semibold tracking-tight text-krikkit-fg">{{ __('settings.Settings') }}</span>
        </header>
        <div class="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
            {{ $slot }}
        </div>
    </div>
</div>
