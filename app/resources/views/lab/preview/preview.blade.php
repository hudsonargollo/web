<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ $documentDir ?? 'ltr' }}" @class(['dark' => \App\Support\Ui\ThemePalette::documentIsDark()])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <x-layouts.partials.themeBoot />
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=sora:400,500,600,700&display=swap" rel="stylesheet" />
        <x-layouts.partials.brand />
        <x-layouts.partials.seo />
        {{-- Register SW only. Do not send krikkit-host-active — that clears guest pathClaims in the workspace tab. --}}
        <script type="text/javascript">
            (function () {
                if (!('serviceWorker' in navigator)) return;
                var SW = '/__krikkit_lab_sw__.js?v=host-vite-5173-29';
                navigator.serviceWorker.register(SW, { scope: '/' }).catch(function () {});
            })();
        </script>
        @vite(['resources/css/app.css', 'resources/js/lab/preview/preview.jsx'])
        <script type="text/javascript">
            (function () {
                if (!('serviceWorker' in navigator)) return;
                var origin = null;
                try {
                    var tag = document.querySelector('script[src*="/@@vite/client"]')
                    if (tag && tag.src) origin = new URL(tag.src).origin
                } catch (e) {}
                var post = function (sw) {
                    try {
                        if (origin) sw.postMessage({ type: 'krikkit-host-vite', origin: origin })
                    } catch (e) {}
                }
                if (navigator.serviceWorker.controller) post(navigator.serviceWorker.controller)
                navigator.serviceWorker.ready.then(function (reg) {
                    if (reg.active) post(reg.active)
                }).catch(function () {})
            })()
        </script>
        <x-layouts.partials.themeStyle />
    </head>
    <body class="min-h-screen bg-krikkit-canvas font-sans text-krikkit-fg antialiased">
        @php
            $previewBootstrap = [
                'uuid' => $project['uuid'] ?? null,
                'title' => $project['title'] ?? null,
                'path' => $guestPath ?? '/',
                'workspaceUrl' => isset($project['uuid']) ? '/lab/'.$project['uuid'].'/workspace' : '/lab',
            ];
        @endphp
        <script type="application/json" id="lab-preview-bootstrap">@json($previewBootstrap)</script>
        <div id="lab-preview-root" class="min-h-dvh bg-krikkit-canvas">
            <div class="flex h-dvh flex-col" role="status" aria-label="{{ __('dashboard.Loading…') }}">
                <header class="flex h-12 shrink-0 items-center gap-2 border-b border-krikkit-line px-4">
                    <span class="truncate text-sm font-semibold tracking-tight text-krikkit-fg">Krikkit</span>
                    <span class="text-krikkit-subtle" aria-hidden>/</span>
                    <span class="text-sm font-medium text-krikkit-fg">Lab</span>
                    <span class="text-krikkit-subtle" aria-hidden>/</span>
                    <span class="text-sm text-krikkit-muted">Preview</span>
                </header>
                <div class="flex min-h-0 flex-1 items-center justify-center">
                    <span class="h-8 w-40 animate-pulse rounded-lg bg-krikkit-soft" aria-hidden></span>
                </div>
            </div>
        </div>
    </body>
</html>
