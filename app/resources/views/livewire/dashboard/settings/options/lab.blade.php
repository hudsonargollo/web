<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Settings') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.Name and status lines shown in the Lab terminal while the preview runtime starts.') }}
        </p>
    </div>

    @include('livewire.dashboard.settings.options.nav')

    <form wire:submit="save" class="space-y-10">
        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Console name') }}</p>

            <krikkit:field :label="__('dashboard.Runtime name')">
                <krikkit:input size="md" wire:model="runtimeName" :placeholder="__('dashboard.DeepThought')" :invalid="$errors->has('runtimeName')" />
                <x-slot:description>
                    {{ __('dashboard.Replaces DeepThought on waiting / install / auto-start lines. Use {name} in the templates below.') }}
                </x-slot:description>
                @error('runtimeName')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Status lines') }}</p>
            <p class="text-sm leading-relaxed text-krikkit-muted">
                {{ __('dashboard.Leave a line empty to keep the default. Tokens: {name}, {command}, {code}, {error}.') }}
            </p>

            @foreach ($statusFields as [$field, $label, $placeholder])
                <krikkit:field :label="$label">
                    <krikkit:input size="md" wire:model="{{ $field }}" :placeholder="$placeholder" :invalid="$errors->has($field)" />
                    @error($field)
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            @endforeach
        </krikkit:card>

        <div class="flex justify-end">
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </form>
</div>
