@php
    $site = $site ?? app(\App\Support\Site\SiteSettings::class);
    $logoLight = $site->assetUrl($site->value('general', 'logo_light'));
    $logoDark = $site->assetUrl($site->value('general', 'logo_dark'));
    $iconLight = $site->assetUrl($site->value('general', 'icon_light'));
    $iconDark = $site->assetUrl($site->value('general', 'icon_dark'));
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
    <span {{ $attributes->class('inline-flex items-center gap-2.5') }}>
        <img src="{{ asset('brand/clubemkt-mark.svg').'?v='.\App\Support\Site\SiteSettings::BUNDLED_VERSION }}" alt="" aria-hidden="true" class="size-8 shrink-0">
        <span class="flex min-w-0 flex-col leading-none">
            <span class="truncate text-[15px] font-semibold tracking-tight text-krikkit-fg">WebKit</span>
            <span class="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-krikkit-subtle">by ClubeMkt</span>
        </span>
    </span>
@endif
