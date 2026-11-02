@props([
    'title' => null,
])

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
        {{ $slot }}
        <x-site.cookieBanner />
        <krikkit:toast />
        @livewireScripts
    </body>
</html>
