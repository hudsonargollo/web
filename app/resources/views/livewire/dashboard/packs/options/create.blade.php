<div class="space-y-6">
    <div class="flex items-center gap-3">
        <krikkit:button
            href="{{ route('dashboard.packs.index') }}"
            variant="ghost"
            square
            size="sm"
            aria-label="{{ __('dashboard.Back') }}"
            title="{{ __('dashboard.Back') }}"
        >
            <krikkit:icon name="arrow-left" class="size-4" />
        </krikkit:button>
        <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">
            {{ __('dashboard.New pack') }}
        </h1>
    </div>

    <form wire:submit="save" class="mx-auto max-w-2xl space-y-6">
        @include('livewire.dashboard.packs.options.form', [
            'catalog' => $catalog,
            'builtIn' => $builtIn,
            'creditExamples' => $creditExamples,
        ])

        <div class="flex justify-end">
            <krikkit:button type="submit" size="md" wire:loading.attr="disabled">
                {{ __('dashboard.Create pack') }}
            </krikkit:button>
        </div>
    </form>
</div>
