<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:field :label="__('dashboard.Eyebrow')">
        <krikkit:input size="md" wire:model="walkthrough.eyebrow" />
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Title')">
        <krikkit:input size="md" wire:model="walkthrough.title" />
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Copy')">
        <krikkit:textarea rows="3" wire:model="walkthrough.copy" />
    </krikkit:field>

    @include('livewire.dashboard.settings.options.asset', [
        'label' => __('dashboard.ASCII background'),
        'property' => 'asciiFile',
        'preview' => $asciiPreview,
        'hint' => __('dashboard.PNG, JPG, or WebP. Used behind the walkthrough and the closing CTA.'),
    ])
</krikkit:card>

<krikkit:card :padding="false" class="space-y-4 !border-0">
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Tabs') }}</p>
    @foreach ($walkthrough['tabs'] ?? [] as $index => $item)
        <div class="space-y-3 border-t border-krikkit-line pt-4 first:border-t-0 first:pt-0">
            <div class="flex justify-end">
                <krikkit:button type="button" variant="ghost" square size="sm" wire:click="removeWalkTab({{ $index }})" :aria-label="__('dashboard.Remove')">
                    <krikkit:icon name="x-mark" class="size-4" />
                </krikkit:button>
            </div>
            <krikkit:field :label="__('dashboard.Label')">
                <krikkit:input size="md" wire:model="walkthrough.tabs.{{ $index }}.label" />
            </krikkit:field>
            <krikkit:field :label="__('dashboard.Title')">
                <krikkit:input size="md" wire:model="walkthrough.tabs.{{ $index }}.title" />
            </krikkit:field>
            <krikkit:field :label="__('dashboard.Copy')">
                <krikkit:textarea rows="2" wire:model="walkthrough.tabs.{{ $index }}.copy" />
            </krikkit:field>
            <krikkit:field :label="__('dashboard.Image URL')">
                <krikkit:input size="md" wire:model="walkthrough.tabs.{{ $index }}.image" />
                <x-slot:description>{{ __('dashboard.Paste a URL, or upload a file below to replace it.') }}</x-slot:description>
            </krikkit:field>
            <krikkit:fileUpload
                accept="image/png,image/jpeg,image/webp"
                :label="__('dashboard.Drop files here or browse')"
                :caption="__('dashboard.PNG, JPG, or WebP')"
                wire:model="walkFiles.{{ $index }}"
            />
        </div>
    @endforeach
    <krikkit:button type="button" variant="outline" size="sm" wire:click="addWalkTab">{{ __('dashboard.Add item') }}</krikkit:button>
</krikkit:card>
