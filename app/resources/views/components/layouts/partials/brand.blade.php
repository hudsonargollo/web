@php
    $site = app(\App\Support\Site\SiteSettings::class);
    $favicon = $site->faviconUrl();
    $apple = $site->appleTouchUrl();
@endphp
@if ($favicon)
    <link rel="icon" href="{{ $favicon }}">
@endif
@if ($apple)
    <link rel="apple-touch-icon" href="{{ $apple }}">
@endif
