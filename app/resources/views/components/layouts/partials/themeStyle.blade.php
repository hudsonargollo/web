@php
    use App\Support\Ui\ThemePalette;

    $savedTheme = ThemePalette::normalize(auth()->user()?->appearance);
@endphp
<style id="krikkit-theme">{!! ThemePalette::runtimeCss($savedTheme['accent'] ?? 'base', $savedTheme['base'] ?? 'neutral') !!}</style>
