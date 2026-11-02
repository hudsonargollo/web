<?php

namespace App\Http\Middleware;

use App\Support\DevTunnel;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Same-origin stand-in for the Vite dev server when Lab is opened via a
 * public HTTPS tunnel (trycloudflare). The browser never talks to :5173.
 */
final class ProxyViteDevServer
{
    public function handle(Request $request, Closure $next): Response
    {
        DevTunnel::remember($request);

        if (! $this->shouldProxy($request)) {
            return $next($request);
        }

        $origin = trim((string) @file_get_contents(public_path('hot')));
        $origin = rtrim($origin, " \t\n\r/");
        if ($origin === '') {
            return $next($request);
        }

        $url = $origin.$request->getRequestUri();

        try {
            $upstream = Http::withHeaders($this->forwardHeaders($request))
                ->withOptions(['http_errors' => false])
                ->timeout(20)
                ->send($request->method(), $url);
        } catch (Throwable) {
            return $next($request);
        }

        $response = response($upstream->body(), $upstream->status());
        foreach ($upstream->headers() as $name => $values) {
            $key = strtolower((string) $name);
            if (in_array($key, [
                'transfer-encoding',
                'connection',
                'keep-alive',
                'content-encoding',
                'content-length',
                'cross-origin-opener-policy',
                'cross-origin-embedder-policy',
            ], true)) {
                continue;
            }
            $response->headers->set($name, $values);
        }

        return $response;
    }

    private function shouldProxy(Request $request): bool
    {
        if (! is_file(public_path('hot'))) {
            return false;
        }

        if (! DevTunnel::isPublicDevHost($request->getHost())) {
            return false;
        }

        return DevTunnel::isViteDevPath($request->getPathInfo());
    }

    /**
     * @return array<string, string>
     */
    private function forwardHeaders(Request $request): array
    {
        $headers = [];
        foreach (['accept', 'accept-language'] as $name) {
            $value = $request->headers->get($name);
            if (is_string($value) && $value !== '') {
                $headers[$name] = $value;
            }
        }

        return $headers;
    }
}
