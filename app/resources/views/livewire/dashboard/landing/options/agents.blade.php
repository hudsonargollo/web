<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:field :label="__('dashboard.Title')">
        <krikkit:input size="md" wire:model="agents.title" />
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Copy')">
        <krikkit:textarea rows="3" wire:model="agents.copy" />
    </krikkit:field>
</krikkit:card>

<krikkit:card :padding="false" class="space-y-4 !border-0">
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Agents') }}</p>
    @foreach ($agents['items'] ?? [] as $index => $item)
        <div class="space-y-3 border-t border-krikkit-line pt-4 first:border-t-0 first:pt-0">
            <div class="flex justify-end">
                <krikkit:button type="button" variant="ghost" square size="sm" wire:click="removeAgent({{ $index }})" :aria-label="__('dashboard.Remove')">
                    <krikkit:icon name="x-mark" class="size-4" />
                </krikkit:button>
            </div>
            <krikkit:field :label="__('dashboard.Title')">
                <krikkit:input size="md" wire:model="agents.items.{{ $index }}.title" />
            </krikkit:field>
            <krikkit:field :label="__('dashboard.Copy')">
                <krikkit:textarea rows="2" wire:model="agents.items.{{ $index }}.copy" />
            </krikkit:field>
        </div>
    @endforeach
    <krikkit:button type="button" variant="outline" size="sm" wire:click="addAgent">{{ __('dashboard.Add item') }}</krikkit:button>
</krikkit:card>
