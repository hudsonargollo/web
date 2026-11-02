<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:field :label="__('dashboard.Copy')">
        <krikkit:textarea rows="3" wire:model="cta.copy" />
    </krikkit:field>
    <p class="text-xs text-krikkit-muted">{{ $hrefHint }}</p>
    <div class="grid gap-4 sm:grid-cols-2">
        <krikkit:field :label="__('dashboard.Primary button')">
            <krikkit:input size="md" wire:model="cta.primary_label" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Link')">
            <krikkit:input size="md" wire:model="cta.primary_href" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Guest button')">
            <krikkit:input size="md" wire:model="cta.guest_secondary_label" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Link')">
            <krikkit:input size="md" wire:model="cta.guest_secondary_href" />
        </krikkit:field>
    </div>
    <p class="text-xs text-krikkit-muted">{{ __('dashboard.Signed-in visitors see Dashboard as the second action. ASCII background is shared with Walkthrough.') }}</p>
</krikkit:card>
