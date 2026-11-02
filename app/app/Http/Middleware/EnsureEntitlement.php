<?php

namespace App\Http\Middleware;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Entitlement\GrantKind;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEntitlement
{
    public function __construct(
        private readonly EntitlementGate $gate,
    ) {}

    public function handle(Request $request, Closure $next, string $code): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(401);
        }

        $definition = EntitlementCatalog::definition($code);
        $kind = $definition['kind'] ?? GrantKind::Feature;

        if ($kind === GrantKind::Quota) {
            $this->gate->assertQuota($user, $code);
        } else {
            $this->gate->assertFeature($user, $code);
        }

        return $next($request);
    }
}
