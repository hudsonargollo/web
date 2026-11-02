<section class="space-y-4">
    <div>
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Default model') }}</p>
        <p class="mt-1 text-xs text-krikkit-muted">
            {{ __('dashboard.Used by Lab when the chat picker hasn’t chosen a model yet.') }}
        </p>
    </div>

    <form wire:submit="saveDefaults" class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <krikkit:field :label="__('dashboard.Model')" class="min-w-0 flex-1">
            <krikkit:select
                size="md"
                wire:model="defaultModel"
                :value="$defaultModel"
                placeholder="{{ __('dashboard.Choose a model…') }}"
                :invalid="$errors->has('defaultModel')"
            >
                @foreach ($models as $model)
                    <krikkit:select.option
                        :value="$model->id"
                        :selected="$defaultModel === $model->id"
                    >
                        {{ $model->label }}{{ $model->available ? '' : __('dashboard. — key missing') }}
                    </krikkit:select.option>
                @endforeach
            </krikkit:select>
            @error('defaultModel')
                <krikkit:field.error>{{ $message }}</krikkit:field.error>
            @enderror
        </krikkit:field>

        <krikkit:button type="submit" size="md" wire:loading.attr="disabled">
            {{ __('dashboard.Save default') }}
        </krikkit:button>
    </form>
</section>
