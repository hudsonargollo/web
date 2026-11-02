<x-layouts.guest :title="__('messages.Reset password')">
    <x-auth.heading :copy="__('messages.Choose a new password for this account.')">
        {{ __('messages.Reset password') }}
    </x-auth.heading>

    <form method="POST" action="{{ route('password.store') }}" class="space-y-5">
        @csrf
        <input type="hidden" name="token" value="{{ $token }}">
        <x-form.input :label="__('messages.Email')" type="email" name="email" autocomplete="username" :value="$email" :placeholder="__('messages.you@example.com')" />
        <x-form.input :label="__('messages.Password')" type="password" name="password" autocomplete="new-password" :value="''" :placeholder="__('messages.••••••••')" />
        <x-form.input :label="__('messages.Confirm password')" type="password" name="password_confirmation" autocomplete="new-password" :value="''" :placeholder="__('messages.••••••••')" />

        <krikkit:button type="submit" class="w-full">{{ __('messages.Reset password') }}</krikkit:button>
    </form>
</x-layouts.guest>
