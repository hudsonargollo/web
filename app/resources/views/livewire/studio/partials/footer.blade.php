@php
    $hasBlog = \App\Support\Content\PublicIndex::blogIsLive();
    $hasPages = \App\Support\Content\PublicIndex::pagesAreLive();
    $socialX = trim((string) $site->value('general', 'social_x', ''));
    $socialGithub = trim((string) $site->value('general', 'social_github', ''));
@endphp

<footer class="mt-auto border-t border-krikkit-line/50 px-4 py-12 sm:px-6 lg:px-10">
    <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('studio.Product') }}</p>
            <div class="mt-3 flex flex-col gap-2 text-sm text-krikkit-muted">
                <a href="{{ route('lab') }}" class="hover:text-krikkit-fg">{{ __('messages.Lab') }}</a>
                <a href="{{ route('home') }}" wire:navigate class="hover:text-krikkit-fg">{{ __('studio.Home') }}</a>
                <a href="{{ route('projects') }}" wire:navigate class="hover:text-krikkit-fg">{{ __('studio.Projects') }}</a>
            </div>
        </div>
        @if ($hasBlog || $hasPages || $site->privacyPublished() || $site->termsPublished())
            <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('studio.More') }}</p>
                <div class="mt-3 flex flex-col gap-2 text-sm text-krikkit-muted">
                    @if ($hasBlog)
                        <a href="{{ route('blog') }}" class="hover:text-krikkit-fg">{{ __('messages.Blog') }}</a>
                    @endif
                    @if ($hasPages)
                        <a href="{{ route('pages') }}" class="hover:text-krikkit-fg">{{ __('messages.Pages') }}</a>
                    @endif
                    @if ($site->privacyPublished())
                        <a href="{{ route('privacy') }}" class="hover:text-krikkit-fg">{{ __('studio.Privacy') }}</a>
                    @endif
                    @if ($site->termsPublished())
                        <a href="{{ route('terms') }}" class="hover:text-krikkit-fg">{{ __('studio.Terms') }}</a>
                    @endif
                </div>
            </div>
        @endif
        @if ($socialX !== '' || $socialGithub !== '')
            <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('studio.Connect') }}</p>
                <div class="mt-3 flex flex-col gap-2 text-sm text-krikkit-muted">
                    @if ($socialX !== '')
                        <a href="{{ $socialX }}" class="hover:text-krikkit-fg" rel="noreferrer">X</a>
                    @endif
                    @if ($socialGithub !== '')
                        <a href="{{ $socialGithub }}" class="hover:text-krikkit-fg" rel="noreferrer">GitHub</a>
                    @endif
                </div>
            </div>
        @endif
    </div>
</footer>
