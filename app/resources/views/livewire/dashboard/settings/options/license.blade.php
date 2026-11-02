<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Settings') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.Purchase code status for this install.') }}
        </p>
    </div>

    @include('livewire.dashboard.settings.options.nav')

    <krikkit:callout :tone="$statusTone">
        <krikkit:callout.heading>{{ $statusLabel }}</krikkit:callout.heading>
        @if ($row['notice'] !== '')
            <krikkit:callout.text>{{ $row['notice'] }}</krikkit:callout.text>
        @endif
    </krikkit:callout>

    <krikkit:card :padding="false" class="space-y-4 !border-0">
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Status') }}</p>

        <dl class="grid gap-3 text-sm sm:grid-cols-2">
            <div>
                <dt class="text-krikkit-subtle">{{ __('dashboard.Bound host') }}</dt>
                <dd class="mt-0.5 text-krikkit-fg">{{ $row['bound_host'] !== '' ? $row['bound_host'] : '—' }}</dd>
            </div>
            <div>
                <dt class="text-krikkit-subtle">{{ __('dashboard.Last check') }}</dt>
                <dd class="mt-0.5 text-krikkit-fg">{{ $row['checked_at'] !== '' ? $row['checked_at'] : '—' }}</dd>
            </div>
            <div>
                <dt class="text-krikkit-subtle">{{ __('dashboard.Key') }}</dt>
                <dd class="mt-0.5 font-mono text-krikkit-fg">{{ $row['tail'] !== '' ? '••••'.$row['tail'] : '—' }}</dd>
            </div>
            <div>
                <dt class="text-krikkit-subtle">{{ __('dashboard.Type') }}</dt>
                <dd class="mt-0.5 text-krikkit-fg">{{ $row['kind'] !== '' ? $row['kind'] : '—' }}</dd>
            </div>
        </dl>
    </krikkit:card>

    <form wire:submit="bind" class="space-y-6" autocomplete="off">
        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.License key') }}</p>

            <krikkit:field :label="__('dashboard.License key')">
                <krikkit:input
                    size="md"
                    wire:model="token"
                    autocomplete="off"
                    spellcheck="false"
                    :placeholder="__('dashboard.Paste your key')"
                    :invalid="$errors->has('token')"
                />
                <x-slot:description>{{ __('dashboard.Bind or replace the key for this domain.') }}</x-slot:description>
                @error('token')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </krikkit:card>

        <div class="flex flex-wrap justify-end gap-2">
            @if ($canRecheck)
                <krikkit:button type="button" variant="outline" wire:click="recheck" wire:loading.attr="disabled">
                    {{ __('dashboard.Recheck') }}
                </krikkit:button>
            @endif
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Activate') }}
            </krikkit:button>
        </div>
    </form>
</div>
