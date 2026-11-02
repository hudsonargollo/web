<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = trim((string) $request->header('X-MoneyMachine-Key', ''));
        $token = ApiToken::findByKey($key);

        if ($token === null) {
            return response()->json(['message' => 'Invalid API key'], 401);
        }

        $token->markUsed();
        $request->attributes->set('api_token', $token);

        return $next($request);
    }
}
