<?php

namespace App\Support\Vite;

use App\Support\DevTunnel;
use Illuminate\Foundation\Vite;
use Illuminate\Http\Request;

/**
 * On a public HTTPS tunnel, point @vite tags at this host so the browser
 * does not load http://127.0.0.1:5173 (CORS / private-network block).
 */
final class TunnelAwareVite extends Vite
{
    protected function hotAsset($asset)
    {
        $request = request();
        if ($request instanceof Request && DevTunnel::isPublicDevHost($request->getHost())) {
            return $request->getSchemeAndHttpHost().'/'.ltrim((string) $asset, '/');
        }

        return parent::hotAsset($asset);
    }
}
