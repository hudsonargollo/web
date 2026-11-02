<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Settings') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">
            {{ __('dashboard.Cookie banner and data-controller details.') }}
        </p>
    </div>

    @include('livewire.dashboard.settings.options.nav')

    <form wire:submit="save" class="space-y-10">
        <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Show cookie banner')" wire:model="enabled" />

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Banner') }}</p>

            <krikkit:field :label="__('dashboard.Title')">
                <krikkit:input size="md" wire:model="title" :placeholder="__('dashboard.We use cookies')" :invalid="$errors->has('title')" />
                @error('title')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <krikkit:field :label="__('dashboard.Message')">
                <krikkit:textarea rows="4" wire:model="message" :placeholder="__('messages.We use essential cookies to run this site. Optional analytics stay off until you accept.')" :invalid="$errors->has('message')" />
                <x-slot:description>{{ __('dashboard.Explain what you store and link to the privacy policy.') }}</x-slot:description>
                @error('message')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.Accept label')">
                    <krikkit:input size="md" wire:model="acceptLabel" :placeholder="__('dashboard.Accept')" :invalid="$errors->has('acceptLabel')" />
                    @error('acceptLabel')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Reject label')">
                    <krikkit:input size="md" wire:model="rejectLabel" :placeholder="__('dashboard.Reject')" :invalid="$errors->has('rejectLabel')" />
                    @error('rejectLabel')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            </div>

            <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Show reject button')" wire:model="showReject" />
            <krikkit:switch align="right" class="w-full justify-between" :label="__('dashboard.Wait for consent before analytics')" wire:model="consentAnalytics" />
        </krikkit:card>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Controller') }}</p>

            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.Controller name')">
                    <krikkit:input size="md" wire:model="controllerName" :placeholder="__('dashboard.Acme Inc.')" :invalid="$errors->has('controllerName')" />
                    @error('controllerName')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Controller email')">
                    <krikkit:input size="md" type="email" wire:model="controllerEmail" :placeholder="__('dashboard.privacy@example.com')" :invalid="$errors->has('controllerEmail')" />
                    @error('controllerEmail')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
            </div>
        </krikkit:card>

        <div class="flex justify-end">
            <krikkit:button type="submit" wire:loading.attr="disabled">
                {{ __('dashboard.Save changes') }}
            </krikkit:button>
        </div>
    </form>
</div>
