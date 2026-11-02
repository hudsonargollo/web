@props([
    'title' => null,
    'skeleton' => 'page',
    'breadcrumbs' => [],
    'wide' => false,
])

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ $documentDir ?? 'ltr' }}" @class(['h-full', 'dark' => \App\Support\Ui\ThemePalette::documentIsDark()])>
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
    <body class="h-full overflow-hidden bg-krikkit-canvas font-sans text-krikkit-fg antialiased">
        <div
            class="flex h-full"
            x-data="{
                navOpen: false,
                desktop: false,
                init() {
                    const mq = window.matchMedia('(min-width: 1024px)')
                    const sync = () => {
                        this.desktop = mq.matches
                        if (this.desktop) this.navOpen = false
                    }
                    sync()
                    mq.addEventListener('change', sync)
                },
                openNav() { this.navOpen = true },
                closeNav() { this.navOpen = false },
                toggleNav() { this.navOpen = ! this.navOpen },
            }"
            x-on:keydown.escape.window="if (navOpen) closeNav()"
            x-on:livewire:navigating.window="closeNav()"
            x-on:krikkit-nav-open.window="openNav()"
            x-on:krikkit-nav-close.window="closeNav()"
            x-on:krikkit-nav-toggle.window="toggleNav()"
        >
            <div
                x-cloak
                x-show="navOpen"
                x-transition.opacity.duration.200ms
                class="fixed inset-0 z-40 bg-black/40 lg:hidden"
                x-on:click="closeNav()"
            ></div>

            <x-dashboard.sidebar />

            <div class="flex min-h-0 min-w-0 flex-1 flex-col bg-krikkit-canvas">
                <x-dashboard.header :breadcrumbs="$breadcrumbs" />

                <main class="krikkit-scroll-hover min-h-0 flex-1 overflow-y-auto bg-krikkit-canvas px-4 py-6 sm:px-5 sm:py-8 lg:px-8">
                    <div
                        class="relative mx-auto {{ $wide ? 'max-w-6xl' : 'max-w-5xl' }}"
                        x-data="krikkitPageLoad"
                        x-on:livewire:navigating.window="start()"
                        x-on:livewire:navigated.window="stop()"
                        x-on:livewire:navigate-error.window="stop()"
                    >
                        <div
                            x-show="loading"
                            x-cloak
                            class="absolute inset-0 z-10 bg-krikkit-canvas"
                            :style="minHeight ? `min-height: ${minHeight}px` : null"
                        >
                            <x-dashboard.pageSkeleton :variant="$skeleton" />
                        </div>

                        {{-- Keep content in the DOM (no x-show hide) so Livewire morph + back work. --}}
                        <div
                            x-ref="page"
                            :class="loading ? 'invisible pointer-events-none' : ''"
                            :aria-busy="loading ? 'true' : 'false'"
                        >
                            {{ $slot }}
                        </div>
                    </div>
                </main>
            </div>
        </div>

        <krikkit:command placeholder="{{ __('dashboard.Jump to…') }}">
            <krikkit:command.item keywords="overview home dashboard" :href="route('dashboard.home')">{{ __('dashboard.Overview') }}</krikkit:command.item>
            @allows('users.browse')
                <krikkit:command.item keywords="users directory" :href="route('dashboard.users.index')">{{ __('dashboard.Users') }}</krikkit:command.item>
            @endallows
            @allows('roles.browse')
                <krikkit:command.item keywords="roles access" :href="route('dashboard.roles.index')">{{ __('dashboard.Roles') }}</krikkit:command.item>
            @endallows
            @allows('projects.browse')
                <krikkit:command.item keywords="lab projects" :href="route('dashboard.lab.index')">{{ __('dashboard.Lab') }}</krikkit:command.item>
                <krikkit:command.item keywords="lab usage credits model" :href="route('dashboard.lab.usage')">{{ __('dashboard.Usage') }}</krikkit:command.item>
                <krikkit:command.item keywords="lab failed stuck turns" :href="route('dashboard.lab.turns')">{{ __('dashboard.Failed turns') }}</krikkit:command.item>
            @endallows
            @allows('packs.browse')
                <krikkit:command.item keywords="plan billing pack quota subscription" :href="route('dashboard.packs.index')">{{ __('dashboard.Packs') }}</krikkit:command.item>
            @endallows
            @allows('finance.browse')
                <krikkit:command.item keywords="credits grant top-up" :href="route('dashboard.credits.index')">{{ __('dashboard.Credits') }}</krikkit:command.item>
                <krikkit:command.item keywords="finance mrr invoices subscriptions credits billing revenue" :href="route('dashboard.finance.index')">{{ __('dashboard.Finance') }}</krikkit:command.item>
                <krikkit:command.item keywords="subscriptions packs billing" :href="route('dashboard.finance.subscriptions.index')">{{ __('dashboard.Subscriptions') }}</krikkit:command.item>
                <krikkit:command.item keywords="invoices refund stripe paypal" :href="route('dashboard.invoices.index')">{{ __('dashboard.Invoices') }}</krikkit:command.item>
                <krikkit:command.item keywords="webhooks events stripe paypal" :href="route('dashboard.finance.events.index')">{{ __('dashboard.Events') }}</krikkit:command.item>
            @endallows
            @allows('payments.revise')
                <krikkit:command.item keywords="payments payment methods stripe paypal checkout keys" :href="route('dashboard.payments.index')">{{ __('dashboard.Payment Methods') }}</krikkit:command.item>
            @endallows
            @allows('languages.browse')
                <krikkit:command.item keywords="languages locale translate i18n" :href="route('dashboard.languages.index')">{{ __('dashboard.Languages') }}</krikkit:command.item>
            @endallows
            @allows('ai.revise')
                <krikkit:command.item keywords="api integration ai models providers keys cost estimator github token unsplash pixabay photographs" :href="route('dashboard.integration.index')">{{ __('dashboard.API Integration') }}</krikkit:command.item>
            @endallows
            @allows('sessions.browse')
                <krikkit:command.item keywords="sessions logins devices activity" :href="route('dashboard.sessions.index')">{{ __('dashboard.Sessions') }}</krikkit:command.item>
            @endallows
            @allows('contacts.browse')
                <krikkit:command.item keywords="contacts inbox messages agency talk to us" :href="route('dashboard.contacts.index')">{{ __('dashboard.Contacts') }}</krikkit:command.item>
            @endallows
            @allows('settings.revise')
                <krikkit:command.item keywords="landing home page hero footer copy buttons images" :href="route('dashboard.landing.index')">{{ __('dashboard.Landing page') }}</krikkit:command.item>
                <krikkit:command.item keywords="newsletter subscribers email list footer" :href="route('dashboard.newsletter.index')">{{ __('dashboard.Newsletter') }}</krikkit:command.item>
                <krikkit:command.item keywords="seo meta analytics" :href="route('dashboard.seo.index')">{{ __('dashboard.SEO') }}</krikkit:command.item>
                <krikkit:command.item keywords="settings general brand logo favicon" :href="route('dashboard.settings.index')">{{ __('dashboard.Settings') }}</krikkit:command.item>
                <krikkit:command.item keywords="themes colors accent base customize" :href="route('dashboard.settings.themes')">{{ __('dashboard.Themes') }}</krikkit:command.item>
                <krikkit:command.item keywords="mail smtp from email" :href="route('dashboard.settings.mail')">{{ __('dashboard.Mail') }}</krikkit:command.item>
                <krikkit:command.item keywords="license key purchase code verify" :href="route('dashboard.settings.license')">{{ __('dashboard.License') }}</krikkit:command.item>
                <krikkit:command.item keywords="publish lab subdomain custom domain wildcard" :href="route('dashboard.settings.publish')">{{ __('dashboard.Publish settings') }}</krikkit:command.item>
                <krikkit:command.item keywords="lab console deepthought runtime terminal package.json autostart" :href="route('dashboard.settings.lab')">{{ __('dashboard.Lab console') }}</krikkit:command.item>
                <krikkit:command.item keywords="gdpr cookies consent" :href="route('dashboard.settings.gdpr')">{{ __('dashboard.GDPR') }}</krikkit:command.item>
                <krikkit:command.item keywords="privacy policy" :href="route('dashboard.settings.privacy')">{{ __('dashboard.Privacy policy') }}</krikkit:command.item>
                <krikkit:command.item keywords="terms of use legal" :href="route('dashboard.settings.terms')">{{ __('dashboard.Terms') }}</krikkit:command.item>
            @endallows
            @allows('security.self')
                <krikkit:command.item keywords="profile account name avatar" :href="route('dashboard.profile.index')">{{ __('dashboard.Profile') }}</krikkit:command.item>
                <krikkit:command.item keywords="password security" :href="route('dashboard.profile.password')">{{ __('dashboard.Password') }}</krikkit:command.item>
                <krikkit:command.item keywords="two factor 2fa security" :href="route('dashboard.profile.two-factor')">{{ __('dashboard.Two-factor') }}</krikkit:command.item>
            @endallows
        </krikkit:command>

        <krikkit:toast />
        @livewireScripts
    </body>
</html>
