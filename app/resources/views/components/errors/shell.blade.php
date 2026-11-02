@props([
    'code',
    'title',
    'description',
    'primaryHref' => null,
    'primaryLabel' => null,
    'secondaryHref' => null,
    'secondaryLabel' => null,
    'pageTitle' => null,
])

@php
    $site = app(\App\Support\Site\SiteSettings::class);
    $user = auth()->user();
    $canDashboard = $user instanceof \App\Models\User && $user->allows('dashboard.access');
    $canLab = $user instanceof \App\Models\User;

    $primaryHref ??= route('home');
    $primaryLabel ??= __('messages.Back home');

    app(\App\Support\Seo\PageSeo::class)->page([
        'title' => $pageTitle ?? $title,
        'description' => $description,
        'index' => false,
        'follow' => false,
    ]);
@endphp

<x-layouts.app :title="$pageTitle ?? $title">
    <div class="flex min-h-screen flex-col bg-krikkit-canvas">
        <header class="border-b border-krikkit-line bg-krikkit-surface px-5 py-4 sm:px-8">
            <a href="{{ route('home') }}" class="inline-flex items-center gap-2.5">
                <x-site.mark />
                @unless ($site->logoUrl())
                    <span class="text-sm font-semibold tracking-tight text-krikkit-fg">{{ $site->name() }}</span>
                @endunless
            </a>
        </header>

        <main class="flex flex-1 flex-col items-center justify-center px-5 py-16 sm:px-8">
            <div class="w-full max-w-lg">
                <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-krikkit-subtle">{{ $code }}</p>
                <h1 class="mt-4 text-3xl font-medium leading-tight tracking-tight text-krikkit-fg sm:text-4xl">
                    {{ $title }}
                </h1>
                <p class="mt-3 max-w-md text-sm leading-relaxed text-krikkit-muted">
                    {{ $description }}
                </p>
                <span class="mt-8 block h-px w-10 bg-accent" aria-hidden="true"></span>

                <div class="mt-8 flex flex-wrap items-center gap-3">
                    <krikkit:button href="{{ $primaryHref }}" :navigate="false">
                        {{ $primaryLabel }}
                    </krikkit:button>
                    @if ($secondaryHref && $secondaryLabel)
                        <krikkit:button href="{{ $secondaryHref }}" variant="outline" :navigate="false">
                            {{ $secondaryLabel }}
                        </krikkit:button>
                    @elseif ($canLab && $code !== '403')
                        <krikkit:button href="{{ route('lab') }}" variant="outline" :navigate="false">
                            {{ __('messages.Open Lab') }}
                        </krikkit:button>
                    @elseif ($canDashboard)
                        <krikkit:button href="{{ route('dashboard.home') }}" variant="outline" :navigate="false">
                            {{ __('messages.Dashboard') }}
                        </krikkit:button>
                    @endif
                </div>
            </div>
        </main>
    </div>
</x-layouts.app>
