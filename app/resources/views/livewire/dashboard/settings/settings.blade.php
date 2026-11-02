<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Settings') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.Workspace name, brand marks, and public access.') }}
        </p>
    </div>

    @include('livewire.dashboard.settings.options.nav')

    <form wire:submit="save" class="space-y-10">
        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Identity') }}</p>

            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.Site name')">
                    <krikkit:input size="md" wire:model="name" :placeholder="__('dashboard.Krikkit')" :invalid="$errors->has('name')" />
                    @error('name')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Site URL')">
                    <krikkit:input size="md" type="url" wire:model="url" placeholder="https://" :invalid="$errors->has('url')" />
                    @error('url')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            </div>

            <krikkit:field :label="__('dashboard.Tagline')">
                <krikkit:input size="md" wire:model="tagline" :placeholder="__('dashboard.Build in the Lab.')" :invalid="$errors->has('tagline')" />
                <x-slot:description>{{ __('dashboard.Short line under the name on the public site.') }}</x-slot:description>
                @error('tagline')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.Legal name')">
                    <krikkit:input size="md" wire:model="legalName" :placeholder="__('dashboard.Acme Inc.')" :invalid="$errors->has('legalName')" />
                    @error('legalName')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Copyright')">
                    <krikkit:input size="md" wire:model="copyright" placeholder="© {{ date('Y') }}" :invalid="$errors->has('copyright')" />
                    @error('copyright')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            </div>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Brand') }}</p>
            <p class="text-xs text-krikkit-muted">{{ __('dashboard.Light marks sit on pale surfaces. Dark marks sit on dark surfaces.') }}</p>

            <div class="grid gap-6 sm:grid-cols-2">
                @include('livewire.dashboard.settings.options.asset', [
                    'label' => __('dashboard.Logo · light'),
                    'hint' => __('dashboard.Used in light mode.'),
                    'property' => 'logoLight',
                    'preview' => $previews['logoLight'],
                ])
                @include('livewire.dashboard.settings.options.asset', [
                    'label' => __('dashboard.Logo · dark'),
                    'hint' => __('dashboard.Used in dark mode.'),
                    'property' => 'logoDark',
                    'preview' => $previews['logoDark'],
                ])
                @include('livewire.dashboard.settings.options.asset', [
                    'label' => __('dashboard.Favicon'),
                    'hint' => __('dashboard.Browser tab icon. PNG, SVG, or ICO.'),
                    'property' => 'favicon',
                    'preview' => $previews['favicon'],
                    'accept' => 'image/png,image/svg+xml,image/x-icon,.ico',
                ])
                @include('livewire.dashboard.settings.options.asset', [
                    'label' => __('dashboard.Apple touch icon'),
                    'hint' => __('dashboard.Home-screen icon on iOS.'),
                    'property' => 'appleTouch',
                    'preview' => $previews['appleTouch'],
                    'accept' => 'image/png,image/jpeg,image/webp',
                ])
                @include('livewire.dashboard.settings.options.asset', [
                    'label' => __('dashboard.SVG icon · light'),
                    'hint' => __('dashboard.Compact mark for the sidebar and auth.'),
                    'property' => 'iconLight',
                    'preview' => $previews['iconLight'],
                ])
                @include('livewire.dashboard.settings.options.asset', [
                    'label' => __('dashboard.SVG icon · dark'),
                    'hint' => __('dashboard.Compact mark for dark mode.'),
                    'property' => 'iconDark',
                    'preview' => $previews['iconDark'],
                ])
            </div>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Contact') }}</p>

            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.Support email')">
                    <krikkit:input size="md" type="email" wire:model="supportEmail" :placeholder="__('dashboard.you@example.com')" :invalid="$errors->has('supportEmail')" />
                    @error('supportEmail')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Contact email')">
                    <krikkit:input size="md" type="email" wire:model="contactEmail" :placeholder="__('dashboard.hello@example.com')" :invalid="$errors->has('contactEmail')" />
                    @error('contactEmail')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.X / Twitter')">
                    <krikkit:input size="md" type="url" wire:model="socialX" placeholder="https://x.com/…" :invalid="$errors->has('socialX')" />
                    @error('socialX')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.GitHub')">
                    <krikkit:input size="md" type="url" wire:model="socialGithub" placeholder="https://github.com/…" :invalid="$errors->has('socialGithub')" />
                    @error('socialGithub')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Discord')">
                    <krikkit:input size="md" type="url" wire:model="socialDiscord" placeholder="https://discord.gg/…" :invalid="$errors->has('socialDiscord')" />
                    @error('socialDiscord')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.LinkedIn')">
                    <krikkit:input size="md" type="url" wire:model="socialLinkedin" placeholder="https://linkedin.com/…" :invalid="$errors->has('socialLinkedin')" />
                    @error('socialLinkedin')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            </div>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Workspace') }}</p>

            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <krikkit:field :label="__('dashboard.Locale')">
                    <krikkit:select size="md" wire:model="locale" :value="$locale" :invalid="$errors->has('locale')">
                        @foreach ($locales as $code => $label)
                            <krikkit:select.option :value="$code" :selected="$locale === $code">{{ $label }}</krikkit:select.option>
                        @endforeach
                    </krikkit:select>
                    @error('locale')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Timezone')">
                    <krikkit:select size="md" searchable wire:model="timezone" :value="$timezone" :invalid="$errors->has('timezone')">
                        @foreach ($timezones as $zone)
                            <krikkit:select.option :value="$zone" :selected="$timezone === $zone">{{ $zone }}</krikkit:select.option>
                        @endforeach
                    </krikkit:select>
                    @error('timezone')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Currency')">
                    <krikkit:select size="md" searchable wire:model="currency" :value="$currency" :invalid="$errors->has('currency')">
                        @foreach ($currencies as $code => $label)
                            <krikkit:select.option :value="$code" :selected="$currency === $code">{{ $label }}</krikkit:select.option>
                        @endforeach
                    </krikkit:select>
                    <x-slot:description>{{ __('dashboard.Used for pack prices and billing display.') }}</x-slot:description>
                    @error('currency')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            </div>
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Access') }}</p>

            <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Allow public registration')" wire:model="allowRegistration" />
            <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Maintenance mode')" wire:model="maintenance" />

            <krikkit:field :label="__('dashboard.Maintenance message')">
                <krikkit:textarea rows="3" wire:model="maintenanceMessage" :placeholder="__('dashboard.We will be back shortly.')" :invalid="$errors->has('maintenanceMessage')" />
                <x-slot:description>{{ __('dashboard.Shown to guests while the public site is closed. Owners can still sign in.') }}</x-slot:description>
                @error('maintenanceMessage')
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
