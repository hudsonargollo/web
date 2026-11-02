<x-layouts.guest :title="__('messages.Log in')">
    <x-auth.heading :copy="__('messages.Sign in to continue.')">
        {{ __('messages.Welcome back') }}
    </x-auth.heading>

    <form method="POST" action="{{ route('login') }}" class="space-y-5">
        @csrf
        <x-form.input :label="__('messages.Email')" type="email" name="email" autocomplete="username" :placeholder="__('messages.you@example.com')" />
        <x-form.input :label="__('messages.Password')" type="password" name="password" autocomplete="current-password" :value="''" :placeholder="__('messages.••••••••')" />

        <div class="flex items-center justify-between gap-3">
            <krikkit:checkbox name="remember" value="1" :label="__('messages.Remember me')" class="text-xs text-krikkit-muted" />
            <a href="{{ route('password.request') }}" class="shrink-0 text-xs font-medium text-krikkit-muted transition hover:text-krikkit-fg">{{ __('messages.Forgot your password?') }}</a>
        </div>

        <krikkit:button type="submit" class="w-full">{{ __('messages.Log in') }}</krikkit:button>
    </form>

    @if (app(\App\Support\Site\SiteSettings::class)->allowRegistration())
        <p class="mt-8 border-t border-krikkit-line pt-5 text-sm text-krikkit-muted">
            {{ __('messages.No account?') }}
            <a href="{{ route('register') }}" class="font-medium text-krikkit-fg transition hover:text-accent-content">{{ __('messages.Register') }}</a>
        </p>
    @endif
</x-layouts.guest>
