@php
    $header = $landing->section('header');
    $links = $landing->headerLinks($hasBlog);
    $guestEntry = $landing->guestEntryHref();
@endphp

<header class="sticky top-0 z-50 bg-krikkit-canvas/90 backdrop-blur-xl">
    <div class="mx-auto max-w-7xl border-x border-krikkit-line">
        <nav class="flex items-center justify-between border-b border-krikkit-line px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
            <a href="{{ route('home') }}" class="flex items-center text-krikkit-fg transition hover:opacity-80">
                <x-site.mark />
            </a>

            <div class="hidden items-center gap-1 lg:flex">
                @foreach ($links as $link)
                    <a href="{{ $link['href'] }}" class="px-4 py-2 text-sm font-medium text-krikkit-muted transition-colors hover:text-krikkit-fg">{{ $link['label'] }}</a>
                @endforeach
            </div>

            <div class="hidden items-center gap-6 lg:flex">
                @auth
                    <a href="{{ route('dashboard.home') }}" class="text-sm font-medium text-krikkit-muted transition-colors hover:text-krikkit-fg">{{ filled($header['auth_link_label'] ?? null) ? $header['auth_link_label'] : __('messages.Dashboard') }}</a>
                    <a href="{{ route('lab') }}" class="inline-flex items-center justify-center gap-2 bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90">
                        <krikkit:icon name="lab" class="size-4" />
                        {{ filled($header['auth_cta_label'] ?? null) ? $header['auth_cta_label'] : __('messages.Open Lab') }}
                    </a>
                @else
                    <a href="{{ $landing->href($header['guest_link_href'] ?? '', route('login')) }}" class="text-sm font-medium text-krikkit-muted transition-colors hover:text-krikkit-fg">{{ $header['guest_link_label'] }}</a>
                    <a href="{{ $landing->href($header['guest_cta_href'] ?? '', $guestEntry) }}" class="inline-flex items-center justify-center bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90">{{ $header['guest_cta_label'] }}</a>
                @endauth
            </div>

            <div class="flex items-center gap-4 lg:hidden">
                <a href="{{ auth()->check() ? route('dashboard.home') : $landing->href($header['guest_link_href'] ?? '', route('login')) }}" class="text-sm font-medium text-krikkit-fg-soft">{{ auth()->check() ? (filled($header['auth_link_label'] ?? null) ? $header['auth_link_label'] : __('messages.Dashboard')) : $header['guest_link_label'] }}</a>
                <button type="button" class="p-1 text-krikkit-fg" x-on:click="menu = ! menu" :aria-expanded="menu.toString()" aria-label="Open menu">
                    <span x-show="! menu"><krikkit:icon name="bars-3" class="size-6" /></span>
                    <span x-cloak x-show="menu"><krikkit:icon name="x-mark" class="size-6" /></span>
                </button>
            </div>
        </nav>
    </div>

    <div
        class="overflow-hidden border-b border-krikkit-line bg-krikkit-canvas transition-[max-height,opacity] duration-300 lg:hidden"
        x-bind:class="menu ? 'max-h-[600px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'"
    >
        <div class="mx-auto max-w-7xl border-x border-krikkit-line px-6 py-6">
            <nav class="flex flex-col">
                @foreach ($links as $link)
                    <a href="{{ $link['href'] }}" x-on:click="menu = false" class="block py-3 text-base font-medium text-krikkit-fg-soft hover:text-krikkit-fg">{{ $link['label'] }}</a>
                @endforeach
            </nav>
            <a
                href="{{ auth()->check() ? route('lab') : $landing->href($header['mobile_cta_href'] ?? '', $guestEntry) }}"
                class="mt-6 flex w-full items-center justify-center gap-2 border border-krikkit-line bg-krikkit-soft px-6 py-3 text-sm font-medium text-krikkit-fg"
            >
                <krikkit:icon name="lab" class="size-4" />
                {{ $header['mobile_cta_label'] }}
            </a>
        </div>
    </div>
</header>
