@props([
    'keywords' => '',
    'href' => null,
])

<button
    type="button"
    x-show="! q || String(@js(strtolower($keywords))).includes(String(q).toLowerCase())"
    {{ $attributes->class('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-krikkit-fg-soft hover:bg-krikkit-soft') }}
    @if ($href) @click="window.location.href = @js($href)" @endif
>
    {{ $slot }}
</button>
