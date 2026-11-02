<x-settings.frame section="profile">
    <div class="space-y-8">
        <div>
            <h1 class="text-2xl font-semibold tracking-tight text-krikkit-fg">{{ __('settings.Two-factor') }}</h1>
            <p class="mt-1 text-sm text-krikkit-muted">
                @if ($enabled)
                    {{ __('dashboard.Two-factor authentication is enabled for your account.') }}
                @else
                    {{ __('dashboard.Add an authenticator app for an extra layer of security.') }}
                @endif
            </p>
        </div>

        @include('livewire.settings.profile.options.nav')

        @unless ($enabled)
            @if ($pendingSecret)
                <div class="space-y-4">
                    <p class="text-sm text-krikkit-muted">{{ __('dashboard.Add this account in your authenticator app using the secret or otpauth URI.') }}</p>
                    <code class="block break-all rounded-lg bg-krikkit-soft px-4 py-3 text-sm text-krikkit-fg">{{ $pendingSecret }}</code>
                    @if ($qrCodeSvg)
                        <div class="inline-block max-w-full overflow-x-auto rounded-lg bg-krikkit-soft p-3">
                            {!! $qrCodeSvg !!}
                        </div>
                    @endif
                    <form wire:submit="confirmSetup" class="space-y-4">
                        <krikkit:field :label="__('dashboard.Confirmation code')">
                            <krikkit:input size="md" wire:model="code" autocomplete="one-time-code" :invalid="$errors->has('code')" />
                            @error('code')
                                <krikkit:field.error>{{ $message }}</krikkit:field.error>
                            @enderror
                        </krikkit:field>
                        <div class="flex justify-end">
                            <krikkit:button type="submit">{{ __('dashboard.Confirm and enable') }}</krikkit:button>
                        </div>
                    </form>
                </div>
            @else
                <form wire:submit="enable" class="space-y-8" autocomplete="off">
                    <krikkit:field :label="__('dashboard.Current password')">
                        <krikkit:input size="md" type="password" wire:model="password" autocomplete="current-password" :invalid="$errors->has('password')" />
                        @error('password')
                            <krikkit:field.error>{{ $message }}</krikkit:field.error>
                        @enderror
                    </krikkit:field>
                    <div class="flex justify-end">
                        <krikkit:button type="submit">{{ __('dashboard.Enable two-factor authentication') }}</krikkit:button>
                    </div>
                </form>
            @endif
        @endunless

        @if ($recoveryCodes !== [])
            <krikkit:callout tone="warning">
                <krikkit:callout.heading>{{ __('dashboard.Recovery codes') }}</krikkit:callout.heading>
                <krikkit:callout.text>{{ __('dashboard.Store these codes somewhere safe. Each code can be used once.') }}</krikkit:callout.text>
                <ul class="mt-3 grid gap-1 font-mono text-sm">
                    @foreach ($recoveryCodes as $item)
                        <li>{{ $item }}</li>
                    @endforeach
                </ul>
            </krikkit:callout>
        @endif

        @if ($enabled)
            <form wire:submit="regenerate" class="space-y-4" autocomplete="off">
                <krikkit:field :label="__('dashboard.Current password')">
                    <krikkit:input size="md" type="password" wire:model="regeneratePassword" autocomplete="current-password" :invalid="$errors->has('regeneratePassword')" />
                    @error('regeneratePassword')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <div class="flex justify-end">
                    <krikkit:button type="submit" variant="outline">{{ __('dashboard.Regenerate') }}</krikkit:button>
                </div>
            </form>

            <div class="space-y-4">
                <krikkit:field :label="__('dashboard.Current password')">
                    <krikkit:input size="md" type="password" wire:model="disablePassword" autocomplete="current-password" :invalid="$errors->has('disablePassword')" />
                    @error('disablePassword')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <div class="flex justify-end">
                    <krikkit:button type="button" variant="danger" wire:click="askDisable">{{ __('dashboard.Disable') }}</krikkit:button>
                </div>
            </div>

            <krikkit:confirm name="disable-two-factor" :title="__('dashboard.Disable two-factor authentication')" :copy="__('dashboard.Turn off two-factor for this account?')">
                <x-slot:action>
                    <krikkit:button type="button" variant="danger" wire:click="confirmPending">{{ __('dashboard.Disable') }}</krikkit:button>
                </x-slot:action>
            </krikkit:confirm>
        @endif
    </div>
</x-settings.frame>
