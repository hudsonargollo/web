<?php

namespace App\Datastore;

use App\Ai\Support\ProviderHttp;
use Illuminate\Http\Client\PendingRequest;

/**
 * Short-timeout HTTP for data-plane APIs (same proxy/IPv4 guards as Lab AI).
 */
final class DatastoreHttp
{
    public static function make(?int $timeout = null): PendingRequest
    {
        return ProviderHttp::make([
            'timeout' => $timeout ?? (int) config('datastore.http.timeout', 12),
        ]);
    }
}
