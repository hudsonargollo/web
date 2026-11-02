<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:field :label="__('dashboard.Eyebrow')">
        <krikkit:input size="md" wire:model="platform.eyebrow" />
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Title')">
        <krikkit:input size="md" wire:model="platform.title" />
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Copy')">
        <krikkit:textarea rows="3" wire:model="platform.copy" />
    </krikkit:field>
</krikkit:card>

<krikkit:card :padding="false" class="space-y-4 !border-0">
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Layers') }}</p>
    @foreach ($platform['layers'] ?? [] as $index => $layer)
        <div class="space-y-3 border-t border-krikkit-line pt-4 first:border-t-0 first:pt-0">
            <div class="flex justify-end">
                <krikkit:button type="button" variant="ghost" square size="sm" wire:click="removeLayer({{ $index }})" :aria-label="__('dashboard.Remove')">
                    <krikkit:icon name="x-mark" class="size-4" />
                </krikkit:button>
            </div>
            <krikkit:field :label="__('dashboard.Title')">
                <krikkit:input size="md" wire:model="platform.layers.{{ $index }}.title" />
            </krikkit:field>
            <krikkit:field :label="__('dashboard.Copy')">
                <krikkit:textarea rows="2" wire:model="platform.layers.{{ $index }}.copy" />
            </krikkit:field>
        </div>
    @endforeach
    <krikkit:button type="button" variant="outline" size="sm" wire:click="addLayer">{{ __('dashboard.Add item') }}</krikkit:button>
</krikkit:card>

<krikkit:card :padding="false" class="space-y-4 !border-0">
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Quote') }}</p>
    <krikkit:field :label="__('dashboard.Quote')">
        <krikkit:textarea rows="3" wire:model="platform.quote" />
    </krikkit:field>
    <div class="grid gap-4 sm:grid-cols-2">
        <krikkit:field :label="__('dashboard.Name')">
            <krikkit:input size="md" wire:model="platform.quote_name" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Role')">
            <krikkit:input size="md" wire:model="platform.quote_role" />
        </krikkit:field>
    </div>
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Stats') }}</p>
    @foreach ($platform['stats'] ?? [] as $index => $stat)
        <div class="flex items-end gap-3">
            <krikkit:field class="flex-1" :label="__('dashboard.Stat')">
                <krikkit:input size="md" wire:model="platform.stats.{{ $index }}" />
            </krikkit:field>
            <krikkit:button type="button" variant="ghost" square size="sm" wire:click="removeStat({{ $index }})" :aria-label="__('dashboard.Remove')">
                <krikkit:icon name="x-mark" class="size-4" />
            </krikkit:button>
        </div>
    @endforeach
    <krikkit:button type="button" variant="outline" size="sm" wire:click="addStat">{{ __('dashboard.Add item') }}</krikkit:button>
</krikkit:card>
