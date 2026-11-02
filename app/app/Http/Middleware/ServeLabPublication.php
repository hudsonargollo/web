<?php

namespace App\Http\Middleware;

use App\Lab\Publish\LabPublishConfig;
use App\Lab\Publish\PublishHost;
use App\Models\LabPublication;
use App\Support\DevTunnel;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Serve a published Lab site when the Host is a live subdomain or verified custom domain.
 * Runs first so the main app session/CSRF stack never touches public site traffic.
 */
final class ServeLabPublication
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('HEAD') === false && ! $request->isMethod('GET')) {
            return $next($request);
        }

        try {
            if (! Schema::hasTable('lab_publications')) {
                return $next($request);
            }

            $config = app(LabPublishConfig::class);
            $hosts = app(PublishHost::class);
            $host = strtolower($request->getHost());
            if ($host === $config->appHost() || DevTunnel::isPublicDevHost($host)) {
                return $next($request);
            }

            if (! $config->enabled()) {
                $slug = $hosts->subdomainFromRequestHost($host);
                if (is_string($slug) && $slug !== '') {
                    abort(404);
                }
                if (LabPublication::query()->where('custom_host', $config->punycode($host))->exists()) {
                    abort(404);
                }

                return $next($request);
            }

            $slug = $hosts->subdomainFromRequestHost($host);
            if (is_string($slug) && $slug !== '') {
                $publication = LabPublication::findLiveByHost($host, $config, $hosts);
                if ($publication === null || $publication->project === null) {
                    abort(404);
                }

                return $this->serve($publication, $request);
            }

            $publication = LabPublication::findLiveByHost($host, $config, $hosts);
            if ($publication !== null && $publication->project !== null) {
                return $this->serve($publication, $request);
            }

            if (LabPublication::query()->where('custom_host', $config->punycode($host))->exists()) {
                abort(404);
            }
        } catch (Throwable $e) {
            if ($this->isHttpException($e)) {
                throw $e;
            }

            return $next($request);
        }

        return $next($request);
    }

    private function isHttpException(Throwable $e): bool
    {
        return $e instanceof HttpExceptionInterface;
    }

    private function serve(LabPublication $publication, Request $request): Response
    {
        $root = storage_path('app/lab/live/'.$publication->project->uuid);
        $rootReal = realpath($root);
        if ($rootReal === false || ! is_dir($rootReal)) {
            abort(404);
        }

        $relative = ltrim($request->path(), '/');
        if ($relative === '' || $relative === '/') {
            $relative = 'index.html';
        }

        $served = $this->fileUnderRoot($rootReal, $relative);
        if ($served !== null) {
            return $this->fileResponse($served, $relative === 'index.html');
        }

        if ($this->looksLikeAsset($relative)) {
            abort(404);
        }

        $index = $rootReal.DIRECTORY_SEPARATOR.'index.html';
        if (! is_file($index)) {
            abort(404);
        }

        return $this->fileResponse($index, true);
    }

    private function fileUnderRoot(string $rootReal, string $relative): ?string
    {
        $relative = str_replace('\\', '/', $relative);
        if ($relative === '' || str_contains($relative, '..')) {
            return null;
        }

        $candidate = $rootReal.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
        $real = realpath($candidate);
        if ($real === false || ! is_file($real)) {
            return null;
        }

        if ($real !== $rootReal && ! str_starts_with($real, $rootReal.DIRECTORY_SEPARATOR)) {
            return null;
        }

        return $real;
    }

    private function looksLikeAsset(string $relative): bool
    {
        $base = basename($relative);

        return str_contains($base, '.');
    }

    private function fileResponse(string $path, bool $html): BinaryFileResponse
    {
        $response = response()->file($path);
        // BinaryFileResponse keeps Symfony's default text/html Content-Type when
        // the header is already present — browsers then refuse JS/CSS under nosniff.
        if ($html) {
            $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
            $response->headers->set('Content-Type', 'text/html; charset=UTF-8');
        } else {
            $response->headers->set('Content-Type', $this->mimeFor($path));
            if (str_contains($path, DIRECTORY_SEPARATOR.'assets'.DIRECTORY_SEPARATOR)) {
                $response->headers->set('Cache-Control', 'public, max-age=31536000, immutable');
            }
        }

        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }

    private function mimeFor(string $path): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        $known = match ($ext) {
            'js', 'mjs' => 'text/javascript; charset=UTF-8',
            'css' => 'text/css; charset=UTF-8',
            'json', 'map' => 'application/json; charset=UTF-8',
            'svg' => 'image/svg+xml',
            'html', 'htm' => 'text/html; charset=UTF-8',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'wasm' => 'application/wasm',
            default => null,
        };

        if ($known !== null) {
            return $known;
        }

        $detected = @mime_content_type($path);

        return is_string($detected) && $detected !== '' && $detected !== 'text/plain'
            ? $detected
            : 'application/octet-stream';
    }
}
