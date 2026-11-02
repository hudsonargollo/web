<x-layouts.app :title="$post->title">
    <main class="mx-auto min-h-screen max-w-2xl px-6 py-16">
        <p class="text-xs text-krikkit-muted">
            <a href="{{ route('blog') }}" class="hover:text-krikkit-fg">{{ __('messages.Blog') }}</a>
        </p>
        <h1 class="mt-4 text-3xl font-semibold tracking-tight text-krikkit-fg">{{ $post->title }}</h1>
        @if ($post->published_on)
            <p class="mt-2 text-sm text-krikkit-muted">{{ $post->published_on->toFormattedDateString() }}</p>
        @endif
        <article class="prose prose-neutral mt-8 max-w-none text-sm leading-relaxed text-krikkit-fg-soft dark:prose-invert">
            {!! $html !!}
        </article>
    </main>
</x-layouts.app>
