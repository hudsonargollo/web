<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Landing page') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.Copy, links, buttons, and images on the public home page.') }}
        </p>
    </div>

    <nav class="-mx-4 flex gap-1 overflow-x-auto border-b border-krikkit-line px-4 pb-px sm:-mx-5 sm:px-5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" aria-label="{{ __('dashboard.Landing page') }}">
        @foreach ($tabs as $key => $label)
            <button
                type="button"
                wire:click="selectTab('{{ $key }}')"
                @class([
                    '-mb-px shrink-0 border-b px-3 py-2 text-sm font-medium transition',
                    'border-krikkit-fg text-krikkit-fg' => $tab === $key,
                    'border-transparent text-krikkit-muted hover:text-krikkit-fg' => $tab !== $key,
                ])
            >{{ $label }}</button>
        @endforeach
    </nav>

    <form wire:submit="save" class="space-y-10">
        @include('livewire.dashboard.landing.options.'.$tab, ['hrefHint' => $hrefHint, 'asciiPreview' => $asciiPreview])

        <div class="flex justify-end">
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </form>
</div>
