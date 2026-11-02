@props([
    'title' => null,
])

@php
    $site = app(\App\Support\Site\SiteSettings::class);
    $status = session('status');
    $statusCopy = match ($status) {
        'verification-link-sent' => __('messages.A new verification link has been sent.'),
        default => is_string($status) && $status !== '' ? $status : null,
    };
    $tagline = $site->tagline();
    if ($tagline === '') {
        $tagline = __('messages.From a brief to a living site.');
    }
@endphp

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ $documentDir ?? 'ltr' }}" @class(['dark' => \App\Support\Ui\ThemePalette::documentIsDark()])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <x-layouts.partials.themeBoot />
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=sora:400,500,600,700&display=swap" rel="stylesheet" />
        <x-layouts.partials.brand />
        <x-layouts.partials.seo />
        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/app.css', 'resources/js/app.js'])
        @else
            <script src="https://cdn.tailwindcss.com"></script>
            <script>tailwind.config = { darkMode: 'class' }</script>
        @endif
        <x-layouts.partials.themeStyle />
        @livewireStyles
    </head>
    <body class="min-h-screen bg-krikkit-canvas font-sans text-krikkit-fg antialiased">
        <div class="grid min-h-screen lg:grid-cols-[minmax(20rem,2fr)_minmax(26rem,3fr)]">
            <aside class="relative hidden flex-col justify-between border-r border-krikkit-line bg-krikkit-surface px-10 py-10 lg:flex xl:px-14">
                <a href="{{ route('home') }}" class="flex items-center gap-3">
                    <x-site.mark />
                    @unless ($site->logoUrl())
                        <span class="text-sm font-semibold tracking-tight text-krikkit-fg">{{ $site->name() }}</span>
                    @endunless
                </a>

                <div class="max-w-sm">
                    <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ $site->name() }}</p>
                    <p class="mt-4 text-3xl font-medium leading-tight tracking-tight text-krikkit-fg xl:text-4xl">{{ $tagline }}</p>
                    <span class="mt-8 block h-px w-10 bg-accent" aria-hidden="true"></span>
                </div>

                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-krikkit-subtle">
                    @if ($site->privacyPublished())
                        <a href="{{ route('privacy') }}" class="transition hover:text-krikkit-fg">{{ __('messages.Privacy policy') }}</a>
                    @endif
                    @if ($site->termsPublished())
                        <a href="{{ route('terms') }}" class="transition hover:text-krikkit-fg">{{ __('messages.Terms of use') }}</a>
                    @endif
                </div>
            </aside>

            <div class="flex min-h-screen flex-col">
                <main class="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8">
                    <div class="w-full max-w-[22rem]">
                        <a href="{{ route('home') }}" class="mb-8 flex items-center gap-2.5 lg:hidden">
                            <x-site.mark />
                            @unless ($site->logoUrl())
                                <span class="truncate text-sm font-semibold tracking-tight text-krikkit-fg">{{ $site->name() }}</span>
                            @endunless
                        </a>

                        @if ($statusCopy)
                            <krikkit:callout tone="success" class="mb-6" icon="check-circle">
                                <krikkit:callout.text>{{ $statusCopy }}</krikkit:callout.text>
                            </krikkit:callout>
                        @endif

                        {{ $slot }}
                    </div>
                </main>
            </div>
        </div>
        <x-site.cookieBanner />
        <krikkit:toast />
        @livewireScripts
    </body>
</html>
