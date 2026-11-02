<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Failed turns') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Failed and stuck assistant turns that need a look.') }}</p>
    </div>

    <div class="space-y-3">
        <h2 class="text-sm font-medium text-krikkit-fg">{{ __('dashboard.Failed') }}</h2>
        @if ($failed === [])
            <p class="text-sm text-krikkit-muted">{{ __('dashboard.No failed turns.') }}</p>
        @else
            @include('livewire.dashboard.lab.options.turnRows', ['rows' => $failed, 'kind' => 'failed'])
        @endif
    </div>

    <div class="space-y-3">
        <h2 class="text-sm font-medium text-krikkit-fg">{{ __('dashboard.Stuck') }}</h2>
        <p class="text-[11px] text-krikkit-muted">{{ __('dashboard.In-progress chrome older than :minutes minutes.', ['minutes' => 10]) }}</p>
        @if ($stuck === [])
            <p class="text-sm text-krikkit-muted">{{ __('dashboard.No stuck turns.') }}</p>
        @else
            @include('livewire.dashboard.lab.options.turnRows', ['rows' => $stuck, 'kind' => 'stuck'])
        @endif
    </div>
</div>
