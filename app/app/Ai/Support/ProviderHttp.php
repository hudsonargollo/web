<?php

namespace App\Ai\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Shared HTTP client for provider drivers.
 * Short connect timeout + optional no-proxy / IPv4 to avoid WSL / IDE proxy hangs
 * that surface in the browser as opaque "Failed to fetch".
 */
final class ProviderHttp
{
    /**
     * @param  array<string, mixed>  $config  Provider config slice
     */
    public static function make(array $config = []): PendingRequest
    {
        $timeout = (int) ($config['timeout'] ?? config('ai.http.timeout', 120));
        $connect = (int) config('ai.http.connect_timeout', 15);

        $request = Http::acceptJson()
            ->asJson()
            ->timeout(max(1, $timeout))
            ->connectTimeout(max(1, $connect));

        $curl = [];

        if (config('ai.http.disable_proxy', true)) {
            // Guzzle/cURL require a string for CURLOPT_PROXY — `false` throws
            // "CURLOPT_PROXY must be a string" (Lab → Chat request failed).
            $request = $request->withOptions(['proxy' => '']);
            if (defined('CURLOPT_PROXY')) {
                $curl[CURLOPT_PROXY] = '';
            }
            if (defined('CURLOPT_NOPROXY')) {
                $curl[CURLOPT_NOPROXY] = '*';
            }
        }

        if (config('ai.http.force_ipv4', true) && defined('CURLOPT_IPRESOLVE') && defined('CURL_IPRESOLVE_V4')) {
            $curl[CURLOPT_IPRESOLVE] = CURL_IPRESOLVE_V4;
        }

        // Small receive buffer so streamed provider frames aren't held in
        // cURL until a large chunk fills (same class of delay as PHP fread).
        if (defined('CURLOPT_BUFFERSIZE')) {
            $curl[CURLOPT_BUFFERSIZE] = 128;
        }

        if ($curl !== []) {
            $request = $request->withOptions(['curl' => $curl]);
        }

        return $request;
    }

    /**
     * Same client as make(), with the body left open for SSE.
     *
     * @param  array<string, mixed>  $config
     */
    public static function streaming(array $config = []): PendingRequest
    {
        return self::make($config)
            ->accept('text/event-stream')
            // Compressed SSE buffers whole deflate blocks before any frame can
            // be decoded — force identity so tokens stream byte-by-byte.
            ->withHeaders(['Accept-Encoding' => 'identity'])
            ->withOptions(['stream' => true]);
    }
}
