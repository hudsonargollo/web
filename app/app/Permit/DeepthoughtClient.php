<?php

namespace App\Permit;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Talks to Deep42’s public verify desk. Field names on the wire are the
 * desk’s contract; this client does not share MagicFlow’s class shape.
 */
final class DeepthoughtClient
{
    /**
     * @return array{notice: string, kind: ?string, cap: int|null}
     */
    public function attest(string $token, string $origin = 'krikkit-install'): array
    {
        $token = trim($token);

        if ($token === '') {
            throw new PermitRejected(__('dashboard.Enter a license key first.'));
        }

        $host = $this->boundHost();
        $originUrl = rtrim((string) config('app.url'), '/');

        try {
            $response = Http::timeout(20)
                ->acceptJson()
                ->asJson()
                ->post((string) config('permit.endpoint'), array_filter([
                    'purchase_code' => $token,
                    'purchase_code_hash' => hash('sha256', $token),
                    'domain' => $host,
                    'app_url' => $originUrl !== '' ? $originUrl : null,
                    'host' => $host,
                    'ip_address' => request()?->ip(),
                    'source' => $origin,
                    'reason' => $origin === 'krikkit-settings' ? 'settings' : 'install',
                ], fn ($value) => $value !== null && $value !== ''));
        } catch (ConnectionException $exception) {
            throw new PermitRejected(__('dashboard.Could not reach the license desk.'), previous: $exception);
        } catch (Throwable $exception) {
            throw new PermitRejected(__('dashboard.Could not reach the license desk.'), previous: $exception);
        }

        $body = $response->json();
        $payload = is_array($body) ? $body : [];
        $notice = trim((string) ($payload['message'] ?? ''));

        if ($response->failed() || ($payload['status'] ?? '') !== 'verified') {
            throw new PermitRejected(
                $notice !== '' ? $notice : __('dashboard.License check failed.'),
            );
        }

        $cap = $payload['max_activations'] ?? null;

        return [
            'notice' => $notice !== '' ? $notice : __('dashboard.License is active.'),
            'kind' => isset($payload['license_type']) ? (string) $payload['license_type'] : null,
            'cap' => is_numeric($cap) ? (int) $cap : null,
        ];
    }

    public function boundHost(): string
    {
        $fromApp = parse_url((string) config('app.url'), PHP_URL_HOST);

        if (is_string($fromApp) && $fromApp !== '') {
            return $fromApp;
        }

        $fromRequest = request()?->getHost();

        return is_string($fromRequest) && $fromRequest !== '' ? $fromRequest : 'localhost';
    }
}
