<x-layouts.guest :title="__('messages.Two-factor challenge')">
    <div x-data="{ recovery: false }">
        <x-auth.heading>
            {{ __('messages.Two-factor authentication') }}
        </x-auth.heading>
        <p class="-mt-6 mb-8 text-sm leading-relaxed text-krikkit-muted">
            <span x-show="! recovery">{{ __('messages.Enter the code from your authenticator app.') }}</span>
            <span x-cloak x-show="recovery">{{ __('messages.Enter one of your recovery codes.') }}</span>
        </p>

        <form method="POST" action="{{ route('twoFactorChallenge') }}" class="space-y-5">
            @csrf
            <div x-show="! recovery">
                <x-form.input :label="__('messages.Authentication code')" name="code" autocomplete="one-time-code" :required="false" :placeholder="__('messages.123456')" x-bind:disabled="recovery" />
            </div>
            <div x-cloak x-show="recovery">
                <x-form.input :label="__('messages.Recovery code')" name="recovery_code" :required="false" :placeholder="__('messages.xxxx-xxxx')" x-bind:disabled="! recovery" />
            </div>

            <krikkit:button type="submit" class="w-full">{{ __('messages.Continue') }}</krikkit:button>
        </form>

        <p class="mt-8 border-t border-krikkit-line pt-5 text-sm text-krikkit-muted">
            <button
                type="button"
                class="font-medium text-krikkit-fg transition hover:text-accent-content"
                x-on:click="recovery = ! recovery"
                x-text="recovery ? @js(__('messages.Use an authenticator code')) : @js(__('messages.Use a recovery code'))"
            ></button>
        </p>
    </div>
</x-layouts.guest>
