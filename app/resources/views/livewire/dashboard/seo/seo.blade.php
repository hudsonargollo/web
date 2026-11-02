<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.SEO') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.Search, social cards, and measurement.') }}
        </p>
    </div>

    <form wire:submit="save" class="space-y-10">
        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Search') }}</p>

            <krikkit:field :label="__('dashboard.Meta title')">
                <krikkit:input size="md" wire:model="metaTitle" :placeholder="__('dashboard.Krikkit — Lab')" :invalid="$errors->has('metaTitle')" />
                <x-slot:description>{{ __('dashboard.Falls back to the site name when empty.') }}</x-slot:description>
                @error('metaTitle')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Meta description')">
                <krikkit:textarea rows="3" wire:model="metaDescription" :placeholder="__('dashboard.A short description for search results.')" :invalid="$errors->has('metaDescription')" />
                @error('metaDescription')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Keywords')">
                <krikkit:input size="md" wire:model="metaKeywords" :placeholder="__('dashboard.lab, ai, workspace')" :invalid="$errors->has('metaKeywords')" />
                @error('metaKeywords')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Home title')">
                <krikkit:input size="md" wire:model="titleHome" :placeholder="$titleHomeDefault" :invalid="$errors->has('titleHome')" />
                <x-slot:description>{{ __('dashboard.Default: App name | page. Tokens: {name} {page}.') }}</x-slot:description>
                @error('titleHome')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Dashboard title')">
                <krikkit:input size="md" wire:model="titleDashboard" :placeholder="$titleDashboardDefault" :invalid="$errors->has('titleDashboard')" />
                <x-slot:description>{{ __('dashboard.Default: Dashboard | page.') }}</x-slot:description>
                @error('titleDashboard')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Lab title')">
                <krikkit:input size="md" wire:model="titleLab" :placeholder="$titleLabDefault" :invalid="$errors->has('titleLab')" />
                <x-slot:description>{{ __('dashboard.Default: App name Lab | page.') }}</x-slot:description>
                @error('titleLab')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Canonical URL')">
                <krikkit:input size="md" type="url" wire:model="canonical" placeholder="https://" :invalid="$errors->has('canonical')" />
                @error('canonical')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <div class="space-y-3">
                <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Allow search indexing')" wire:model="robotsIndex" />
                <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Follow outbound links')" wire:model="robotsFollow" />
            </div>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Social cards') }}</p>

            <krikkit:field :label="__('dashboard.Open Graph title')">
                <krikkit:input size="md" wire:model="ogTitle" :placeholder="__('dashboard.Krikkit — Lab')" :invalid="$errors->has('ogTitle')" />
                @error('ogTitle')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Open Graph description')">
                <krikkit:textarea rows="3" wire:model="ogDescription" :placeholder="__('dashboard.A short description for social cards.')" :invalid="$errors->has('ogDescription')" />
                @error('ogDescription')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            @include('livewire.dashboard.settings.options.asset', [
                'label' => __('dashboard.Open Graph image'),
                'hint' => __('dashboard.Recommended 1200×630.'),
                'property' => 'ogImage',
                'preview' => $ogPreview,
                'accept' => 'image/png,image/jpeg,image/webp',
            ])

            <krikkit:field :label="__('dashboard.Twitter handle')">
                <krikkit:input size="md" wire:model="twitterHandle" placeholder="@handle" :invalid="$errors->has('twitterHandle')" />
                @error('twitterHandle')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Measurement') }}</p>

            <krikkit:field :label="__('dashboard.Google Analytics')">
                <krikkit:input size="md" wire:model="analyticsId" placeholder="G-XXXXXXXXXX" :invalid="$errors->has('analyticsId')" />
                <x-slot:description>{{ __('dashboard.Measurement ID. Loaded after cookie consent when GDPR is on.') }}</x-slot:description>
                @error('analyticsId')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Search Console')">
                <krikkit:input size="md" wire:model="searchConsole" :placeholder="__('dashboard.google-site-verification token')" :invalid="$errors->has('searchConsole')" />
                <x-slot:description>{{ __('dashboard.google-site-verification content value.') }}</x-slot:description>
                @error('searchConsole')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>
        </krikkit:card>

        <div class="flex justify-end">
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </form>
</div>
