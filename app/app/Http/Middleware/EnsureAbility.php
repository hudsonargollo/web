<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAbility
{
    public function handle(Request $request, Closure $next, string $ability, string $status = '403'): Response
    {
        $user = $request->user();

        if ($user === null || ! $user->allows($ability)) {
            abort((int) $status);
        }

        return $next($request);
    }
}
