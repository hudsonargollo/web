@props([
    'label',
    'hint' => null,
    'property',
    'preview' => null,
    'accept' => 'image/png,image/jpeg,image/webp,image/svg+xml',
])

<div class="space-y-1.5">
    <div class="flex items-center justify-between gap-3">
        <krikkit:field.label>{{ $label }}</krikkit:field.label>
        @if ($preview)
            <krikkit:button type="button" variant="ghost" size="sm" wire:click="dropAsset('{{ $property }}')">
                {{ __('dashboard.Remove') }}
            </krikkit:button>
        @endif
    </div>
    <krikkit:fileUpload
        :accept="$accept"
        :label="__('dashboard.Drop files here or browse')"
        :caption="$hint ?? __('dashboard.PNG, JPG, SVG…')"
        :preview="$preview"
        wire:model="{{ $property }}"
    />
    @error($property)
        <krikkit:field.error>{{ $message }}</krikkit:field.error>
    @enderror
</div>
