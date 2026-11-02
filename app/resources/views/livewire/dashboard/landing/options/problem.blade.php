<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:field :label="__('dashboard.Title')">
        <krikkit:textarea rows="5" wire:model="problem.title" />
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Copy')">
        <krikkit:textarea rows="3" wire:model="problem.copy" />
    </krikkit:field>
</krikkit:card>
