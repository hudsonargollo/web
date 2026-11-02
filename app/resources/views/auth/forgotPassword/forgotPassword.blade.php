<x-layouts.guest :title="__('messages.Forgot password')">
    <x-auth.heading :copy="__('messages.Enter your email and we will send a reset link.')">
        {{ __('messages.Forgot password') }}
    </x-auth.heading>

    <form method="POST" action="{{ route('password.email') }}" class="space-y-5">
        @csrf
        <x-form.input :label="__('messages.Email')" type="email" name="email" autocomplete="username" :placeholder="__('messages.you@example.com')" />

        <krikkit:button type="submit" class="w-full">{{ __('messages.Email password reset link') }}</krikkit:button>
    </form>

    <p class="mt-8 border-t border-krikkit-line pt-5 text-sm text-krikkit-muted">
        <a href="{{ route('login') }}" class="font-medium text-krikkit-fg transition hover:text-accent-content">{{ __('messages.Back to login') }}</a>
    </p>
</x-layouts.guest>
