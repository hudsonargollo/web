<?php

namespace App\Http\Middleware;

use App\Support\Seo\PageSeo;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApplyPageSeo
{
    public function __construct(private PageSeo $seo) {}

    public function handle(Request $request, Closure $next): Response
    {
        foreach ([
            'seotools',
            'seotools.metatags',
            'seotools.opengraph',
            'seotools.twitter',
            'seotools.json-ld',
            'seotools.json-ld-multi',
        ] as $id) {
            app()->forgetInstance($id);
        }

        $this->seo->reset();
        $this->seo->hydrate($request);

        return $next($request);
    }
}
