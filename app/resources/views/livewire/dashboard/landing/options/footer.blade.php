<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:field :label="__('dashboard.Blurb')">
        <krikkit:textarea rows="3" wire:model="footer.blurb" />
    </krikkit:field>
    <div class="grid gap-4 sm:grid-cols-2">
        <krikkit:field :label="__('dashboard.Subscribe placeholder')">
            <krikkit:input size="md" wire:model="footer.subscribe_placeholder" />
        </krikkit:field>
        <krikkit:field :label="__('dashboard.Subscribe label')">
            <krikkit:input size="md" wire:model="footer.subscribe_label" />
        </krikkit:field>
    </div>
</krikkit:card>

@foreach ($footer['columns'] ?? [] as $column => $col)
    <krikkit:card :padding="false" class="space-y-4 !border-0">
        <krikkit:field :label="__('dashboard.Column')">
            <krikkit:input size="md" wire:model="footer.columns.{{ $column }}.heading" />
        </krikkit:field>
        <p class="text-xs text-krikkit-muted">{{ $hrefHint }}</p>
        @foreach ($col['links'] ?? [] as $index => $link)
            <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <krikkit:field :label="__('dashboard.Label')">
                    <krikkit:input size="md" wire:model="footer.columns.{{ $column }}.links.{{ $index }}.label" />
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Link')">
                    <krikkit:input size="md" wire:model="footer.columns.{{ $column }}.links.{{ $index }}.href" />
                </krikkit:field>
                <div class="flex items-end">
                    <krikkit:button type="button" variant="ghost" square size="sm" wire:click="removeFooterLink({{ $column }}, {{ $index }})" :aria-label="__('dashboard.Remove')">
                        <krikkit:icon name="x-mark" class="size-4" />
                    </krikkit:button>
                </div>
            </div>
        @endforeach
        <krikkit:button type="button" variant="outline" size="sm" wire:click="addFooterLink({{ $column }})">{{ __('dashboard.Add link') }}</krikkit:button>
    </krikkit:card>
@endforeach

<krikkit:card :padding="false" class="space-y-4 !border-0">
    <krikkit:field :label="__('dashboard.Legal heading')">
        <krikkit:input size="md" wire:model="footer.legal_heading" />
    </krikkit:field>
    <p class="text-xs text-krikkit-muted">{{ __('dashboard.Privacy and Terms appear automatically when those pages are published.') }}</p>
    @foreach ($footer['legal_extra'] ?? [] as $index => $item)
        <div class="flex items-end gap-3">
            <krikkit:field class="flex-1" :label="__('dashboard.Label')">
                <krikkit:input size="md" wire:model="footer.legal_extra.{{ $index }}" />
            </krikkit:field>
            <krikkit:button type="button" variant="ghost" square size="sm" wire:click="removeLegalExtra({{ $index }})" :aria-label="__('dashboard.Remove')">
                <krikkit:icon name="x-mark" class="size-4" />
            </krikkit:button>
        </div>
    @endforeach
    <krikkit:button type="button" variant="outline" size="sm" wire:click="addLegalExtra">{{ __('dashboard.Add item') }}</krikkit:button>
</krikkit:card>

<krikkit:card :padding="false" class="space-y-4 !border-0">
    <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Social') }}</p>
    @foreach ($footer['social'] ?? [] as $index => $item)
        <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <krikkit:field :label="__('dashboard.Label')">
                <krikkit:input size="md" wire:model="footer.social.{{ $index }}.label" />
            </krikkit:field>
            <krikkit:field :label="__('dashboard.Link')">
                <krikkit:input size="md" wire:model="footer.social.{{ $index }}.href" />
            </krikkit:field>
            <div class="flex items-end">
                <krikkit:button type="button" variant="ghost" square size="sm" wire:click="removeSocial({{ $index }})" :aria-label="__('dashboard.Remove')">
                    <krikkit:icon name="x-mark" class="size-4" />
                </krikkit:button>
            </div>
        </div>
    @endforeach
    <krikkit:button type="button" variant="outline" size="sm" wire:click="addSocial">{{ __('dashboard.Add link') }}</krikkit:button>
</krikkit:card>
