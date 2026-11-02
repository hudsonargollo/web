@props([
    'user',
    'site',
    'planTitle',
    'packOffer' => null,
])

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

    @include('livewire.studio.partials.sidebar')

    <div class="relative flex min-w-0 flex-1 flex-col bg-krikkit-canvas">
        <div
            class="pointer-events-none absolute inset-x-0 top-0 z-0 h-96 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-accent)_28%,transparent),transparent_70%)]"
            aria-hidden="true"
        ></div>
        <div class="relative z-10 mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col">
            @include('livewire.studio.partials.header')
            <div class="flex min-h-0 flex-1 flex-col">
                {{ $slot }}
            </div>
            @include('livewire.studio.partials.footer')
        </div>
    </div>
</div>
