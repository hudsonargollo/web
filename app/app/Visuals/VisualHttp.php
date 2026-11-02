<?php

namespace App\Visuals;

use App\Ai\Support\ProviderHttp;
use Illuminate\Http\Client\PendingRequest;

/**
 * Short-timeout HTTP for stock catalog APIs (same proxy/IPv4 guards as Lab AI).
 */
final class VisualHttp
{
    public static function make(): PendingRequest
    {
        return ProviderHttp::make([
            'timeout' => (int) config('visuals.http.timeout', 8),
        ]);
    }
}
