@php
    $landing = app(\App\Support\Site\LandingCopy::class);
    $hasBlog = \App\Support\Content\PublicIndex::blogIsLive();
    $links = $landing->headerLinks($hasBlog);
@endphp

<header class="relative z-10 flex min-h-14 items-center gap-3 bg-transparent px-4 py-2 sm:px-6 lg:px-10">
    <div class="flex min-w-0 flex-1 items-center">
        <button
            type="button"
            class="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-krikkit-fg-soft transition hover:bg-krikkit-soft lg:hidden"
            x-on:click="toggleNav()"
            x-bind:aria-expanded="navOpen.toString()"
            aria-controls="krikkit-studio-nav"
            aria-label="{{ __('studio.Open navigation') }}"
        >
            <krikkit:icon name="bars-3" class="size-5" />
        </button>
        <a href="{{ route('home') }}" wire:navigate class="flex items-center gap-2 lg:hidden">
            <span class="truncate text-sm font-semibold tracking-tight text-krikkit-fg">{{ $site->name() }}</span>
        </a>
    </div>

    <nav class="hidden items-center gap-1 lg:flex">
        @foreach ($links as $link)
            @continue($link['label'] === '')
            <a href="{{ $link['href'] }}" class="rounded-lg px-3 py-1.5 text-sm text-krikkit-muted transition hover:bg-krikkit-soft hover:text-krikkit-fg">{{ $link['label'] }}</a>
        @endforeach
    </nav>

    <div class="hidden min-w-0 flex-1 lg:block"></div>
</header>
