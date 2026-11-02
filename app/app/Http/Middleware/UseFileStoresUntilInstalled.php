<?php

namespace App\Http\Middleware;

use Closure;
use Deep42\Hitchhiker\Contracts\InstallationStateManager;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class UseFileStoresUntilInstalled
{
    public function __construct(
        private readonly InstallationStateManager $installState,
    ) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->installState->isInstalled()) {
            // Migrations create sessions/cache tables. Keep the wizard on file
            // stores until the install lock exists — even if .env already says database.
            config([
                'session.driver' => 'file',
                'cache.default' => 'file',
            ]);
        }

        return $next($request);
    }
}
