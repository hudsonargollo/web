<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:field :label="__('dashboard.Eyebrow')">
        <krikkit:input size="md" wire:model="hero.eyebrow" />
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Title')">
        <krikkit:input size="md" wire:model="hero.title" :invalid="$errors->has('hero.title')" />
        @error('hero.title')
            <krikkit:field.error>{{ $message }}</krikkit:field.error>
        @enderror
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Copy')">
        <krikkit:textarea rows="3" wire:model="hero.copy" />
    </krikkit:field>
    <krikkit:field :label="__('dashboard.Footnote')">
        <krikkit:input size="md" wire:model="hero.footnote" />
    </krikkit:field>
</krikkit:card>

<krikkit:card :padding="false" class="space-y-4 !border-0">
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Buttons') }}</p>
    <p class="text-xs text-krikkit-muted">{{ $hrefHint }}</p>
    <div class="grid gap-4 sm:grid-cols-2">
        <krikkit:field :label="__('dashboard.Primary button')">
            <krikkit:input size="md" wire:model="hero.primary_label" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Link')">
            <krikkit:input size="md" wire:model="hero.primary_href" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Secondary button')">
            <krikkit:input size="md" wire:model="hero.secondary_label" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Link')">
            <krikkit:input size="md" wire:model="hero.secondary_href" />
        </krikkit:field>
    </div>
</krikkit:card>
