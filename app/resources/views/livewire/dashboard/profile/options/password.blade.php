<div class="space-y-8">
    <div>
        <h1 class="text-lg font-semibold tracking-tight text-krikkit-fg">{{ __('dashboard.Password') }}</h1>
        <p class="mt-0.5 text-xs text-krikkit-muted">{{ __('dashboard.Update password') }}</p>
    </div>

    @include('livewire.dashboard.profile.options.nav')

    <form wire:submit="save" class="space-y-10" autocomplete="off">
        <div class="sr-only" aria-hidden="true">
            <input type="text" name="prevent_autofill_user" autocomplete="username" tabindex="-1" value="">
            <input type="password" name="prevent_autofill_pass" autocomplete="current-password" tabindex="-1" value="">
        </div>

        <krikkit:card :padding="false" class="space-y-4 !border-0">
            <p class="text-[11px] font-normal uppercase tracking-[0.16em] text-krikkit-subtle">{{ __('dashboard.Sign-in') }}</p>

            <krikkit:field :label="__('dashboard.Current password')">
                <krikkit:input
                    size="md"
                    type="password"
                    wire:model="current_password"
                    autocomplete="current-password"
                    :placeholder="__('dashboard.••••••••')"
                    :invalid="$errors->has('current_password')"
                />
                @error('current_password')
                    <krikkit:field.error>{{ $message }}</krikkit:field.error>
                @enderror
            </krikkit:field>

            <div class="grid gap-4 sm:grid-cols-2">
                <krikkit:field :label="__('dashboard.New password')">
                    <krikkit:input
                        size="md"
                        type="password"
                        wire:model="password"
                        autocomplete="new-password"
                        :placeholder="__('dashboard.••••••••')"
                        :invalid="$errors->has('password')"
                    />
                    @error('password')
                        <krikkit:field.error>{{ $message }}</krikkit:field.error>
                    @enderror
                </krikkit:field>
                <krikkit:field :label="__('dashboard.Confirm password')">
                    <krikkit:input
                        size="md"
                        type="password"
                        wire:model="password_confirmation"
                        autocomplete="new-password"
                        :placeholder="__('dashboard.••••••••')"
                        :invalid="$errors->has('password_confirmation')"
                    />
                    @error('password_confirmation')
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
