@php
    $site = app(\App\Support\Site\SiteSettings::class);
    $landing = app(\App\Support\Site\LandingCopy::class);
    $hasBlog = \App\Support\Content\PublicIndex::blogIsLive();
    $hasPages = \App\Support\Content\PublicIndex::pagesAreLive();
    $walkTabs = $landing->walkTabs();
@endphp

<x-layouts.app>
    <div
        x-data="{
            menu: false,
            stack: 0,
            walk: 0,
            walkView: 0,
            walkGen: 0,
            walkMs: 5000,
            walkFade: false,
            walkTimer: null,
            walkCopy: {{ Illuminate\Support\Js::from($walkTabs) }},
            faq: -1,
            setWalk(index) {
                if (index === this.walk) {
                    this.walkGen++
                    return
                }

                clearTimeout(this.walkTimer)
                this.walk = index
                this.walkGen++
                this.walkFade = true
                this.walkTimer = setTimeout(() => {
                    this.walkView = index
                    this.$nextTick(() => { this.walkFade = false })
                }, 180)
            },
            advanceWalk(from) {
                if (this.walk !== from) {
                    return
                }

                if (this.walkCopy.length === 0) {
                    return
                }

                this.setWalk((from + 1) % this.walkCopy.length)
            },
            destroy() {
                clearTimeout(this.walkTimer)
            },
        }"
        x-on:keydown.escape.window="menu = false"
        class="min-h-screen bg-krikkit-canvas text-krikkit-fg"
    >
        @include('home.partials.header')
        <main>
            @include('home.partials.hero')
            @include('home.partials.problem')
            @include('home.partials.platform')
            @include('home.partials.agents')
            @include('home.partials.walkthrough')
            @include('home.partials.integrations')
            @include('home.partials.faq')
            @include('home.partials.cta')
        </main>
        @include('home.partials.footer')
    </div>
</x-layouts.app>
