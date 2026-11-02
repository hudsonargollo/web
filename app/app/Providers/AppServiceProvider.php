<?php

namespace App\Providers;

use App\Access\AbilityRegistry;
use App\Entitlement\EntitlementGate;
use App\Installer\EnsureInstallerAppKey;
use App\Models\User;
use App\Support\Seo\PageSeo;
use App\Support\Site\SiteSettings;
use App\Support\Storage\PublicDiskLink;
use App\Support\Vite\TunnelAwareVite;
use Deep42\Hitchhiker\Contracts\InstallationStateManager;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Vite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        EnsureInstallerAppKey::hydrate();

        $this->app->singleton(SiteSettings::class);
        $this->app->scoped(PageSeo::class);
        $this->app->singleton(Vite::class, TunnelAwareVite::class);
    }

    public function boot(): void
    {
        $this->keepInstallerOnFileStores();
        $this->bindInstallerToWebStack();
        $this->ensurePublicStorageLink();

        Password::defaults(function () {
            $rule = Password::min(8)->mixedCase()->numbers();

            return app()->isProduction() ? $rule->uncompromised() : $rule;
        });

        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('lab-github-import', function (Request $request) {
            $actor = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(5)->by('lab-github-import|'.$actor);
        });

        foreach (AbilityRegistry::codes() as $code) {
            Gate::define($code, fn (?User $user) => $user?->allows($code) ?? false);
        }

        app(SiteSettings::class)->applyMailConfig();
        app(SiteSettings::class)->applyMoneyConfig();

        Blade::if('allows', fn (string $code) => auth()->user()?->allows($code) ?? false);
        Blade::if('entitled', fn (string $code) => auth()->user()?->entitled($code) ?? false);

        Blade::component('components.access.abilityPicker', 'access.ability-picker');
        Blade::component('components.dashboard.sidebar', 'dashboard.sidebar');
        Blade::component('components.dashboard.header', 'dashboard.header');

        View::composer(['components.layouts.dashboard', 'lab.lab'], function ($view): void {
            $user = auth()->user();
            $view->with(
                'entitlementSnapshot',
                $user instanceof User ? app(EntitlementGate::class)->snapshot($user) : null,
            );
        });

        View::composer([
            'components.layouts.app',
            'components.layouts.guest',
            'components.layouts.dashboard',
            'lab.lab',
            'lab.preview.preview',
        ], function ($view): void {
            $title = $view->offsetExists('title') ? $view->offsetGet('title') : null;
            if (is_string($title) && $title !== '') {
                app(PageSeo::class)->syncLayoutTitle($title);
            }
        });

        View::composer('installer::layouts.installer', function (): void {
            app(PageSeo::class)->page([
                'title' => __('messages.Install'),
                'index' => false,
                'follow' => false,
            ]);
        });
    }

    private function keepInstallerOnFileStores(): void
    {
        try {
            if ($this->app->make(InstallationStateManager::class)->isInstalled()) {
                return;
            }
        } catch (\Throwable) {
            // Treat unknown install state as "still installing".
        }

        // Database session/cache tables do not exist until migrations finish.
        // Keep the wizard on file stores even if .env already says database.
        config([
            'session.driver' => 'file',
            'cache.default' => 'file',
        ]);
    }

    private function ensurePublicStorageLink(): void
    {
        if ($this->app->environment('testing')) {
            return;
        }

        PublicDiskLink::ensure();
    }

    private function bindInstallerToWebStack(): void
    {
        foreach (Route::getRoutes() as $route) {
            $name = $route->getName();
            if (! is_string($name) || ! str_starts_with($name, 'installer.')) {
                continue;
            }

            $route->middleware('web');
        }
    }
}
