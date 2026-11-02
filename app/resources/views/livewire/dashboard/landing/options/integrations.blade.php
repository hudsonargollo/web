<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:callout>
        {{ __('dashboard.Provider marks stay on API Integration. This tab edits the section copy and link.') }}
    </krikkit:callout>
    <krikkit:field :label="__('dashboard.Eyebrow')">
        <krikkit:input size="md" wire:model="integrations.eyebrow" />
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Title')">
        <krikkit:input size="md" wire:model="integrations.title" />
    </krikkit:field>
    <div class="grid gap-4 sm:grid-cols-2">
        <krikkit:field :label="__('dashboard.Button')">
            <krikkit:input size="md" wire:model="integrations.cta_label" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Link')">
            <krikkit:input size="md" wire:model="integrations.cta_href" />
            <x-slot:description>{{ $hrefHint }}</x-slot:description>
        </krikkit:field>
    </div>
</krikkit:card>
