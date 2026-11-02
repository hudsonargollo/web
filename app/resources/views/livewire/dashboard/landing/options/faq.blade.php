<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:field :label="__('dashboard.Title')">
        <krikkit:input size="md" wire:model="faq.title" />
    </krikkit:field>
</krikkit:card>

<krikkit:card :padding="false" class="space-y-4 !border-0">
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.FAQ') }}</p>
    @foreach ($faq['items'] ?? [] as $index => $item)
        <div class="space-y-3 border-t border-krikkit-line pt-4 first:border-t-0 first:pt-0">
            <div class="flex justify-end">
                <krikkit:button type="button" variant="ghost" square size="sm" wire:click="removeFaq({{ $index }})" :aria-label="__('dashboard.Remove')">
                    <krikkit:icon name="x-mark" class="size-4" />
                </krikkit:button>
            </div>
            <krikkit:field :label="__('dashboard.Question')">
                <krikkit:input size="md" wire:model="faq.items.{{ $index }}.q" />
            </krikkit:field>
            <krikkit:field :label="__('dashboard.Answer')">
                <krikkit:textarea rows="3" wire:model="faq.items.{{ $index }}.a" />
            </krikkit:field>
        </div>
    @endforeach
    <krikkit:button type="button" variant="outline" size="sm" wire:click="addFaq">{{ __('dashboard.Add question') }}</krikkit:button>
</krikkit:card>
