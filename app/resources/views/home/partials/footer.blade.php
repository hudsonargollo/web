@php
    $footer = $landing->section('footer');
    $columns = is_array($footer['columns'] ?? null) ? $footer['columns'] : [];
    $social = is_array($footer['social'] ?? null) ? $footer['social'] : [];
    $legalExtra = is_array($footer['legal_extra'] ?? null) ? $footer['legal_extra'] : [];
@endphp

<footer>
    <div class="mx-auto max-w-7xl border-x border-krikkit-line">
        <div class="grid gap-10 border-b border-krikkit-line px-6 py-16 sm:px-10 md:grid-cols-2 md:py-20 lg:grid-cols-6 lg:px-12">
            <div class="lg:col-span-2">
                <a href="{{ route('home') }}" class="inline-flex items-center text-krikkit-fg">
                    <x-site.mark />
                </a>
                <p class="mt-4 max-w-xs text-sm leading-relaxed text-krikkit-muted">
                    {{ $footer['blurb'] }}
                </p>
                <form id="subscribe" action="{{ route('newsletter.store') }}" method="post" class="mt-6 flex max-w-sm scroll-mt-20 border border-krikkit-line">
                    @csrf
                    <label class="sr-only" for="home-subscribe">{{ __('home.Subscribe to updates') }}</label>
                    <input id="home-subscribe" type="email" name="email" required placeholder="{{ $footer['subscribe_placeholder'] }}" class="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-krikkit-fg outline-none placeholder:text-krikkit-subtle">
                    <button type="submit" class="bg-accent px-4 text-sm font-medium text-accent-foreground">{{ $footer['subscribe_label'] }}</button>
                </form>
                @if (session('newsletter') === 'ok')
                    <p class="mt-3 text-sm text-krikkit-fg-soft">{{ __('home.You are on the list.') }}</p>
                @endif
                @error('email')
                    <p class="mt-3 text-sm text-red-400">{{ $message }}</p>
                @enderror
            </div>
            @foreach ($columns as $column)
                <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-krikkit-muted">{{ $column['heading'] }}</p>
                    <div class="mt-4 flex flex-col gap-2 text-sm text-krikkit-muted">
                        @foreach ($column['links'] ?? [] as $link)
                            @php
                                $href = (string) ($link['href'] ?? '');
                                if ($href === 'blog' && ! $hasBlog) {
                                    continue;
                                }
                            @endphp
                            <a href="{{ $landing->href($href, '#') }}" class="hover:text-krikkit-fg">{{ $link['label'] }}</a>
                        @endforeach
                    </div>
                </div>
            @endforeach
            <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-krikkit-muted">{{ $footer['legal_heading'] }}</p>
                <div class="mt-4 flex flex-col gap-2 text-sm text-krikkit-muted">
                    @if ($site->privacyPublished())
                        <a href="{{ route('privacy') }}" class="hover:text-krikkit-fg">Privacy</a>
                    @endif
                    @if ($site->termsPublished())
                        <a href="{{ route('terms') }}" class="hover:text-krikkit-fg">Terms</a>
                    @endif
                    @foreach ($legalExtra as $item)
                        <span>{{ $item }}</span>
                    @endforeach
                </div>
            </div>
        </div>
        <div class="flex flex-col justify-between gap-3 px-6 py-6 text-xs text-krikkit-subtle sm:flex-row sm:items-center sm:px-10 lg:px-12">
            <p>© {{ now()->year }} {{ $site->name() }}. All rights reserved.</p>
            <p class="flex gap-4">
                @foreach ($social as $item)
                    @if (filled($item['href'] ?? null))
                        <a href="{{ $landing->href($item['href'], '#') }}" class="hover:text-krikkit-fg">{{ $item['label'] }}</a>
                    @else
                        <span>{{ $item['label'] }}</span>
                    @endif
                @endforeach
            </p>
        </div>
    </div>
</footer>
