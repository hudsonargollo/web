<x-layouts.app :title="__('messages.Unavailable')">
    <main class="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <x-site.mark class="mb-8" />
        <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">{{ $site->name() }}</h1>
        <p class="mt-3 text-sm leading-relaxed text-krikkit-muted">{{ $site->maintenanceMessage() }}</p>
        <krikkit:button :href="route('login')" :navigate="false" variant="outline" class="mt-8">
            {{ __('messages.Log in') }}
        </krikkit:button>
    </main>
</x-layouts.app>
