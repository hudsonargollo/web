<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Quick HTTPS tunnels (trycloudflare / ngrok) used for local OAuth callbacks.
 */
final class DevTunnel
{
    public const ORIGIN_CACHE_KEY = 'krikkit.dev_tunnel.origin';

    public static function isPublicDevHost(?string $host): bool
    {
        $host = strtolower(trim((string) $host));

        return str_ends_with($host, '.trycloudflare.com')
            || str_ends_with($host, '.ngrok-free.app')
            || str_ends_with($host, '.ngrok.app')
            || str_ends_with($host, '.ngrok.io');
    }

    public static function isHttpsUrl(string $url): bool
    {
        return str_starts_with(strtolower(trim($url)), 'https://');
    }

    public static function remember(Request $request): void
    {
        if (! self::isPublicDevHost($request->getHost())) {
            return;
        }

        $origin = rtrim($request->getSchemeAndHttpHost(), '/');
        if (! self::isHttpsUrl($origin)) {
            return;
        }

        Cache::put(self::ORIGIN_CACHE_KEY, $origin, now()->addHours(12));
    }

    public static function rememberedOrigin(): string
    {
        $origin = trim((string) Cache::get(self::ORIGIN_CACHE_KEY, ''));
        if ($origin === '' || ! self::isHttpsUrl($origin)) {
            return '';
        }

        return rtrim($origin, '/');
    }

    public static function isViteDevPath(string $path): bool
    {
        return str_starts_with($path, '/@')
            || str_starts_with($path, '/resources/')
            || str_starts_with($path, '/node_modules/')
            || str_starts_with($path, '/__vite')
            || $path === '/__krikkit_lab_sw__.js'
            || $path === '/__deepthought_sw__.js';
    }
}
