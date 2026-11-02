<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.New page') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Standalone public pages with their own URL.') }}</p>
    </div>

    @include('livewire.dashboard.pages.options.form')
</div>
