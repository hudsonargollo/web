<?php

namespace App\Http\Middleware;

use App\Support\Locale\LocaleBinder;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApplySiteLocale
{
    public function __construct(private LocaleBinder $locales) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->locales->apply();

        return $next($request);
    }
}
