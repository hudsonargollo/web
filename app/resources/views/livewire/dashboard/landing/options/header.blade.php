<krikkit:card :padding="false" class="space-y-4 !border-0">
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Navigation links') }}</p>
    <p class="text-xs text-krikkit-muted">{{ $hrefHint }}</p>

    @foreach ($header['links'] ?? [] as $index => $link)
        <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <krikkit:field :label="__('dashboard.Label')">
                <krikkit:input size="md" wire:model="header.links.{{ $index }}.label" />
            </krikkit:field>
            <krikkit:field :label="__('dashboard.Link')">
                <krikkit:input size="md" wire:model="header.links.{{ $index }}.href" />
            </krikkit:field>
            <div class="flex items-end">
                <krikkit:button type="button" variant="ghost" square size="sm" wire:click="removeLink('header', {{ $index }})" :aria-label="__('dashboard.Remove')">
                    <krikkit:icon name="x-mark" class="size-4" />
                </krikkit:button>
            </div>
        </div>
    @endforeach

    <krikkit:button type="button" variant="outline" size="sm" wire:click="addLink('header')">{{ __('dashboard.Add link') }}</krikkit:button>
</krikkit:card>

<krikkit:card :padding="false" class="space-y-4 !border-0">
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Buttons') }}</p>

    <div class="grid gap-4 sm:grid-cols-2">
        <krikkit:field :label="__('dashboard.Guest link')">
            <krikkit:input size="md" wire:model="header.guest_link_label" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Link')">
            <krikkit:input size="md" wire:model="header.guest_link_href" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Guest button')">
            <krikkit:input size="md" wire:model="header.guest_cta_label" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Link')">
            <krikkit:input size="md" wire:model="header.guest_cta_href" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Signed-in link')">
            <krikkit:input size="md" wire:model="header.auth_link_label" :placeholder="__('messages.Dashboard')" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Signed-in button')">
            <krikkit:input size="md" wire:model="header.auth_cta_label" :placeholder="__('messages.Open Lab')" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Mobile button')">
            <krikkit:input size="md" wire:model="header.mobile_cta_label" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Link')">
            <krikkit:input size="md" wire:model="header.mobile_cta_href" />
        </krikkit:field>
    </div>
</krikkit:card>
