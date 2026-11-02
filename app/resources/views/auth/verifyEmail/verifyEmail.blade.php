<x-layouts.guest :title="__('messages.Verify email')">
    <x-auth.heading :copy="__('messages.Thanks for signing up. Please verify your email address by clicking the link we just emailed you.')">
        {{ __('messages.Verify your email') }}
    </x-auth.heading>

    <form method="POST" action="{{ route('verification.send') }}" class="space-y-5">
        @csrf
        <krikkit:button type="submit" class="w-full">{{ __('messages.Resend verification email') }}</krikkit:button>
    </form>

    <form method="POST" action="{{ route('logout') }}" class="mt-8 border-t border-krikkit-line pt-5">
        @csrf
        <krikkit:button type="submit" variant="ghost" class="w-full">{{ __('messages.Log out') }}</krikkit:button>
    </form>
</x-layouts.guest>
