@props([
    'value',
    'label' => null,
    'selected' => false,
])

@php
    $text = $label ?? trim(preg_replace('/\s+/u', ' ', strip_tags((string) $slot)));
    $stringValue = (string) $value;
@endphp

<button
    type="button"
    role="option"
    x-init="
        optionLabels.push(@js($text));
        if (@js($selected) || value === @js($stringValue)) {
            value = @js($stringValue);
            label = @js($text);
        }
    "
    x-show="matches(@js($text))"
    x-on:click.stop="choose(@js($stringValue), @js($text))"
    {{ $attributes->class('flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm text-krikkit-fg-soft transition hover:bg-krikkit-soft') }}
    :class="value === @js($stringValue) ? 'bg-krikkit-soft font-medium text-krikkit-fg' : ''"
>
    {{ $text !== '' ? $text : $slot }}
</button>
