<div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
            <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Edit language') }}</h1>
            <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Name, direction, and whether this locale is offered.') }}</p>
        </div>
        @allows('languages.revise')
            <krikkit:button href="{{ route('dashboard.languages.translate', $language) }}" variant="ghost" size="sm">
                {{ __('dashboard.Translate') }}
            </krikkit:button>
        @endallows
    </div>

    @include('livewire.dashboard.languages.options.form', [
        'lockedCode' => true,
        'lockedDefault' => $lockedDefault,
    ])
</div>
