<?php

use App\Entitlement\Exceptions\EntitlementDeniedException;
use App\Http\Middleware\ApplyPageSeo;
use App\Http\Middleware\ApplySiteLocale;
use App\Http\Middleware\EnsureAbility;
use App\Http\Middleware\EnsureEntitlement;
use App\Http\Middleware\ProxyViteDevServer;
use App\Http\Middleware\ServeLabPublication;
use App\Http\Middleware\UseFileStoresUntilInstalled;
use App\Models\User;
use App\Support\Auth\LoginRedirect;
use App\Support\Ui\ThemePalette;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::middleware('web')
                ->prefix('dashboard')
                ->name('dashboard.')
                ->group(base_path('routes/dashboard.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo(function () {
            $user = auth()->user();

            return $user instanceof User
                ? LoginRedirect::homeFor($user)
                : route('home');
        });
        $middleware->trustProxies(at: '*');
        $middleware->prepend(ServeLabPublication::class);
        $middleware->prepend(ProxyViteDevServer::class);
        $middleware->web(prepend: [
            UseFileStoresUntilInstalled::class,
        ]);
        $middleware->web(append: [
            ApplySiteLocale::class,
            ApplyPageSeo::class,
        ]);
        $middleware->alias([
            'ability' => EnsureAbility::class,
            'entitlement' => EnsureEntitlement::class,
        ]);
        $middleware->encryptCookies(except: [
            ThemePalette::MODE_COOKIE,
        ]);
        $middleware->validateCsrfTokens(except: [
            'webhooks/stripe',
            'webhooks/paypal',
        ]);
        // Preserve trailing newlines / indentation when saving Lab site files.
        $middleware->trimStrings(except: [
            'content',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*')
                || ($request->is('lab/*') && $request->expectsJson()),
        );

        $exceptions->render(function (EntitlementDeniedException $e, Request $request) {
            $payload = $e->toArray();

            if ($request->expectsJson()
                || $request->is('lab/*')
                || $request->is('api/*')
                || $request->header('X-Livewire')
            ) {
                return response()->json($payload, EntitlementDeniedException::HTTP_STATUS);
            }

            return redirect()->route('dashboard.packs.index');
        });
    })->create();
