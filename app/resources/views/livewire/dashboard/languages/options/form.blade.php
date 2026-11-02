@props([
    'lockedCode' => false,
    'lockedDefault' => false,
])

<form wire:submit="save" class="space-y-8">
    <krikkit:card class="space-y-4 !border-0 !p-5">
        <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Identity') }}</p>

        <div class="grid gap-4 sm:grid-cols-2">
            <krikkit:field :label="__('dashboard.Name')">
                <krikkit:input size="md" wire:model="name" :placeholder="__('dashboard.French')" :invalid="$errors->has('name')" />
                @error('name')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Native name')">
                <krikkit:input size="md" wire:model="nativeName" :placeholder="__('dashboard.French')" :invalid="$errors->has('nativeName')" />
                @error('nativeName')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
            <krikkit:field :label="__('dashboard.Code')">
                <krikkit:input
                    size="md"
                    wire:model="code"
                    :placeholder="__('dashboard.fr')"
                    :invalid="$errors->has('code')"
                    :disabled="$lockedCode"
                />
                <x-slot:description>{{ __('dashboard.Two-letter locale, optionally with a region (fr, en-GB).') }}</x-slot:description>
                @error('code')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Direction')">
                <krikkit:select size="md" wire:model="direction" :value="$direction" :invalid="$errors->has('direction')">
                    <krikkit:select.option value="ltr" :selected="$direction === 'ltr'">{{ __('dashboard.Left to right') }}</krikkit:select.option>
                    <krikkit:select.option value="rtl" :selected="$direction === 'rtl'">{{ __('dashboard.Right to left') }}</krikkit:select.option>
                </krikkit:select>
                @error('direction')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </div>

        <div class="grid gap-4 pt-1 sm:grid-cols-2">
            <div class="space-y-1.5">
                <krikkit:switch wire:model="isDefault" :label="__('dashboard.Default language')" :disabled="$lockedDefault" />
                <p class="text-xs text-krikkit-muted">{{ __('dashboard.Used when a visitor has no matching locale.') }}</p>
                @error('isDefault')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </div>

            <div class="space-y-1.5">
                <krikkit:switch wire:model="enabled" :label="__('dashboard.Enabled')" :disabled="$lockedDefault && $isDefault" />
                <p class="text-xs text-krikkit-muted">{{ __('dashboard.Disabled languages stay in the list but cannot be selected.') }}</p>
                @error('enabled')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </div>
        </div>
    </krikkit:card>

    <div class="flex justify-end">
        <krikkit:button type="submit" wire:loading.attr="disabled">
            {{ __('dashboard.Save changes') }}
        </krikkit:button>
    </div>
</form>
