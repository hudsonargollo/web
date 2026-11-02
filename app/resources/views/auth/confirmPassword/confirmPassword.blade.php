<x-layouts.guest :title="__('messages.Confirm password')">
    <x-auth.heading :copy="__('messages.This is a secure area. Please confirm your password to continue.')">
        {{ __('messages.Confirm password') }}
    </x-auth.heading>

    <form method="POST" action="{{ route('password.confirm') }}" class="space-y-5">
        @csrf
        <x-form.input :label="__('messages.Password')" type="password" name="password" autocomplete="current-password" :value="''" :placeholder="__('messages.••••••••')" />

        <krikkit:button type="submit" class="w-full">{{ __('messages.Confirm') }}</krikkit:button>
    </form>
</x-layouts.guest>
