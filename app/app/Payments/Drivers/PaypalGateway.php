<?php

namespace App\Payments\Drivers;

use App\Models\Invoice;
use App\Payments\PaymentCatalog;
use App\Payments\PaymentGatewayStore;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class PaypalGateway
{
    public function __construct(
        private readonly PaymentGatewayStore $store,
    ) {}

    /**
     * @return array{ok: bool, message: string}
     */
    public function probe(): array
    {
        $token = $this->accessToken();

        if ($token === null) {
            return ['ok' => false, 'message' => __('dashboard.PayPal rejected the client credentials.')];
        }

        return ['ok' => true, 'message' => __('dashboard.PayPal credentials are valid.')];
    }

    public function verifyWebhook(string $rawBody, array $headers): bool
    {
        $row = $this->store->get(PaymentCatalog::PAYPAL);
        $webhookId = $row['webhook_secret'];
        if ($webhookId === '') {
            return false;
        }

        $token = $this->accessToken();
        if ($token === null) {
            return false;
        }

        $payload = json_decode($rawBody, true);
        if (! is_array($payload)) {
            return false;
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(15)
            ->post($this->apiBase($row['mode']).'/v1/notifications/verify-webhook-signature', [
                'auth_algo' => $this->header($headers, 'PAYPAL-AUTH-ALGO'),
                'cert_url' => $this->header($headers, 'PAYPAL-CERT-URL'),
                'transmission_id' => $this->header($headers, 'PAYPAL-TRANSMISSION-ID'),
                'transmission_sig' => $this->header($headers, 'PAYPAL-TRANSMISSION-SIG'),
                'transmission_time' => $this->header($headers, 'PAYPAL-TRANSMISSION-TIME'),
                'webhook_id' => $webhookId,
                'webhook_event' => $payload,
            ]);

        return $response->successful()
            && strtoupper((string) $response->json('verification_status')) === 'SUCCESS';
    }

    public function accessToken(): ?string
    {
        $row = $this->store->credentials(PaymentCatalog::PAYPAL);
        if ($row['public_key'] === '' || $row['secret_key'] === '') {
            return null;
        }

        $response = Http::asForm()
            ->withBasicAuth($row['public_key'], $row['secret_key'])
            ->timeout(15)
            ->post($this->apiBase($row['mode']).'/v1/oauth2/token', [
                'grant_type' => 'client_credentials',
            ]);

        $token = $response->json('access_token');

        return $response->successful() && is_string($token) && $token !== '' ? $token : null;
    }

    public function refund(Invoice $invoice): void
    {
        $id = trim((string) $invoice->provider_invoice_id);
        if ($id === '') {
            throw new RuntimeException(__('dashboard.This invoice has no provider reference.'));
        }

        $token = $this->accessToken();
        $row = $this->store->credentials(PaymentCatalog::PAYPAL);
        if ($token === null || $row['secret_key'] === '') {
            throw new RuntimeException(__('dashboard.PayPal rejected the client credentials.'));
        }

        $base = $this->apiBase($row['mode']);
        $captureId = $this->captureId($token, $base, $id);

        $response = Http::withToken($token)
            ->acceptJson()
            ->withBody('{}', 'application/json')
            ->timeout(20)
            ->post($base.'/v2/payments/captures/'.$captureId.'/refund');

        if ($this->paypalRefundOk($response)) {
            return;
        }

        throw new RuntimeException((string) ($response->json('message') ?? $response->json('details.0.description') ?? __('dashboard.Could not refund this invoice.')));
    }

    private function captureId(string $token, string $base, string $id): string
    {
        $order = Http::withToken($token)
            ->acceptJson()
            ->timeout(20)
            ->get($base.'/v2/checkout/orders/'.$id);

        if ($order->successful()) {
            foreach ($order->json('purchase_units') ?? [] as $unit) {
                foreach ($unit['payments']['captures'] ?? [] as $capture) {
                    $captureId = (string) ($capture['id'] ?? '');
                    $status = strtoupper((string) ($capture['status'] ?? ''));
                    if ($captureId !== '' && in_array($status, ['COMPLETED', 'PARTIALLY_REFUNDED'], true)) {
                        return $captureId;
                    }
                    if ($captureId !== '') {
                        return $captureId;
                    }
                }
            }
        }

        return $id;
    }

    private function paypalRefundOk(Response $response): bool
    {
        if ($response->successful()) {
            return true;
        }

        $issue = strtoupper((string) ($response->json('name') ?? $response->json('details.0.issue') ?? ''));
        $message = strtolower((string) ($response->json('message') ?? $response->json('details.0.description') ?? ''));

        return $issue === 'CAPTURE_FULLY_REFUNDED'
            || str_contains($message, 'already refunded')
            || str_contains($message, 'fully refunded');
    }

    private function apiBase(string $mode): string
    {
        return $mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    /**
     * @param  array<string, mixed>  $headers
     */
    private function header(array $headers, string $name): string
    {
        foreach ($headers as $key => $value) {
            if (strcasecmp((string) $key, $name) === 0) {
                return is_array($value) ? (string) ($value[0] ?? '') : (string) $value;
            }
        }

        return '';
    }
}
