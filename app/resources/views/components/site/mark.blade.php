@php
    $site = $site ?? app(\App\Support\Site\SiteSettings::class);
    $logoLight = $site->logoUrl('light');
    $logoDark = $site->logoUrl('dark');
    $iconLight = $site->iconUrl('light');
    $iconDark = $site->iconUrl('dark');
    $showLogo = $logoLight || $logoDark;
    $showIcon = ! $showLogo && ($iconLight || $iconDark);
@endphp

@if ($showLogo)
    <span {{ $attributes->class('inline-flex items-center') }}>
        @if ($logoLight)
            <img src="{{ $logoLight }}" alt="{{ $site->name() }}" class="h-8 max-w-40 object-contain dark:hidden">
        @endif
        @if ($logoDark || $logoLight)
            <img src="{{ $logoDark ?? $logoLight }}" alt="{{ $site->name() }}" class="{{ $logoLight ? 'hidden dark:block' : '' }} h-8 max-w-40 object-contain">
        @endif
    </span>
@elseif ($showIcon)
    <span {{ $attributes->class('inline-flex items-center') }}>
        @if ($iconLight)
            <img src="{{ $iconLight }}" alt="{{ $site->name() }}" class="size-8 object-contain dark:hidden">
        @endif
        @if ($iconDark || $iconLight)
            <img src="{{ $iconDark ?? $iconLight }}" alt="{{ $site->name() }}" class="{{ $iconLight ? 'hidden dark:block' : '' }} size-8 object-contain">
        @endif
    </span>
@else
    <span {{ $attributes->class('inline-flex size-8 items-center justify-center rounded-lg bg-accent text-xs font-semibold tracking-tight text-accent-foreground') }}>
        {{ strtoupper(substr($site->name(), 0, 1)) }}
    </span>
@endif
