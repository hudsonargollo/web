<?php

namespace App\Lab\Github;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * HTTP client for GitHub REST / zipball downloads (shared-hosting friendly).
 * Callers pass an access token when authenticated requests are required.
 */
final class GithubHttp
{
    public static function api(?string $token = null): PendingRequest
    {
        $request = self::base()
            ->accept('application/vnd.github+json')
            ->withHeaders([
                'X-GitHub-Api-Version' => '2022-11-28',
                'User-Agent' => config('lab.github.user_agent', 'Krikkit-Lab'),
            ]);

        if (filled($token)) {
            $request = $request->withToken($token);
        }

        return $request;
    }

    /**
     * Binary download client (zipballs).
     */
    public static function download(?string $token = null): PendingRequest
    {
        $request = self::base()
            ->withHeaders([
                'Accept' => 'application/vnd.github+json',
                'X-GitHub-Api-Version' => '2022-11-28',
                'User-Agent' => config('lab.github.user_agent', 'Krikkit-Lab'),
            ])
            ->withOptions(['allow_redirects' => true]);

        if (filled($token)) {
            $request = $request->withToken($token);
        }

        return $request;
    }

    public static function apiBase(): string
    {
        return rtrim((string) config('services.github.api_url', 'https://api.github.com'), '/');
    }

    private static function base(): PendingRequest
    {
        $timeout = (int) config('lab.github.timeout', 60);
        $connect = (int) config('lab.github.connect_timeout', 15);

        $request = Http::timeout(max(1, $timeout))
            ->connectTimeout(max(1, $connect));

        $curl = [];

        if (config('lab.github.disable_proxy', true)) {
            $request = $request->withOptions(['proxy' => '']);
            if (defined('CURLOPT_PROXY')) {
                $curl[CURLOPT_PROXY] = '';
            }
            if (defined('CURLOPT_NOPROXY')) {
                $curl[CURLOPT_NOPROXY] = '*';
            }
        }

        if (config('lab.github.force_ipv4', true) && defined('CURLOPT_IPRESOLVE') && defined('CURL_IPRESOLVE_V4')) {
            $curl[CURLOPT_IPRESOLVE] = CURL_IPRESOLVE_V4;
        }

        if ($curl !== []) {
            $request = $request->withOptions(['curl' => $curl]);
        }

        return $request;
    }
}
