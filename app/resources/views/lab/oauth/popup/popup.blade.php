<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => \App\Support\Ui\ThemePalette::documentIsDark()])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <x-layouts.partials.themeBoot />
        <x-layouts.partials.seo />
        <style>
            body { margin: 0; }
        </style>
    </head>
    <body class="flex min-h-dvh items-center justify-center bg-krikkit-canvas px-6 text-center text-sm text-krikkit-muted">
        <p>{{ $ok ? __('dashboard.Supabase connected. You can close this window.') : $message }}</p>
        <script>
            (function () {
                var payload = {
                    source: 'krikkit-lab',
                    kind: 'datastore-oauth',
                    ok: @json((bool) $ok),
                    message: @json((string) $message),
                    t: Date.now(),
                }
                try {
                    if (typeof BroadcastChannel === 'function') {
                        var channel = new BroadcastChannel('krikkit-lab-datastore-oauth')
                        channel.postMessage(payload)
                        channel.close()
                    }
                } catch (e) {}
                try {
                    window.localStorage.setItem('krikkit-lab-datastore-oauth', JSON.stringify(payload))
                } catch (e) {}
                try {
                    if (window.opener && ! window.opener.closed) {
                        window.opener.postMessage(payload, '*')
                    }
                } catch (e) {}
                window.close()
            })()
        </script>
    </body>
</html>
