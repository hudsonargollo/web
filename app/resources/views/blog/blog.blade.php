<x-layouts.app :title="__('messages.Blog')">
    <main class="mx-auto min-h-screen max-w-2xl px-6 py-16">
        <p class="text-xs text-krikkit-muted">
            <a href="{{ url('/') }}" class="hover:text-krikkit-fg">{{ $site->name() }}</a>
        </p>
        <h1 class="mt-4 text-3xl font-semibold tracking-tight text-krikkit-fg">{{ __('messages.Blog') }}</h1>

        @if ($posts->isEmpty())
            <p class="mt-8 text-sm text-krikkit-muted">{{ __('messages.No posts yet.') }}</p>
        @else
            <ul class="mt-10 space-y-8">
                @foreach ($posts as $post)
                    <li>
                        <a href="{{ route('blog.entry', $post->slug) }}" class="group block">
                            <h2 class="text-lg font-semibold text-krikkit-fg group-hover:text-accent-content">{{ $post->title }}</h2>
                            @if ($post->published_on)
                                <p class="mt-1 text-xs text-krikkit-muted">{{ $post->published_on->toFormattedDateString() }}</p>
                            @endif
                            @if (filled($post->excerpt))
                                <p class="mt-2 text-sm text-krikkit-fg-soft">{{ $post->excerpt }}</p>
                            @endif
                        </a>
                    </li>
                @endforeach
            </ul>
        @endif
    </main>
</x-layouts.app>
