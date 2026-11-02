<?php

namespace App\Payments\Drivers;

use App\Models\Invoice;
use App\Payments\PaymentCatalog;
use App\Payments\PaymentGatewayStore;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class StripeGateway
{
    public function __construct(
        private readonly PaymentGatewayStore $store,
    ) {}

    /**
     * @return array{ok: bool, message: string}
     */
    public function probe(): array
    {
        $row = $this->store->get(PaymentCatalog::STRIPE);
        $secret = $row['secret_key'];

        if ($secret === '') {
            return ['ok' => false, 'message' => __('dashboard.Add a Stripe secret key first.')];
        }

        $response = Http::withToken($secret)
            ->acceptJson()
            ->timeout(15)
            ->get('https://api.stripe.com/v1/account');

        if ($response->successful()) {
            $name = (string) ($response->json('settings.dashboard.display_name') ?? $response->json('id') ?? 'Stripe');

            return ['ok' => true, 'message' => __('dashboard.Connected to :name.', ['name' => $name])];
        }

        $error = (string) ($response->json('error.message') ?? __('dashboard.Stripe rejected the secret key.'));

        return ['ok' => false, 'message' => $error];
    }

    public function signatureValid(string $payload, string $header, string $secret): bool
    {
        if ($secret === '' || $header === '') {
            return false;
        }

        $parts = [];
        foreach (explode(',', $header) as $item) {
            [$key, $value] = array_pad(explode('=', trim($item), 2), 2, '');
            $parts[$key][] = $value;
        }

        $timestamp = $parts['t'][0] ?? '';
        $signatures = $parts['v1'] ?? [];
        if ($timestamp === '' || $signatures === []) {
            return false;
        }

        if (abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp.'.'.$payload, $secret);

        foreach ($signatures as $signature) {
            if (hash_equals($expected, $signature)) {
                return true;
            }
        }

        return false;
    }

    public function refund(Invoice $invoice): void
    {
        $id = trim((string) $invoice->provider_invoice_id);
        if ($id === '') {
            throw new RuntimeException(__('dashboard.This invoice has no provider reference.'));
        }

        $secret = $this->store->credentials(PaymentCatalog::STRIPE)['secret_key'];
        if ($secret === '') {
            throw new RuntimeException(__('dashboard.Add a Stripe secret key first.'));
        }

        $target = $this->refundTarget($secret, $id);
        $payload = [];
        if (filled($target['payment_intent'] ?? null)) {
            $payload['payment_intent'] = $target['payment_intent'];
        } elseif (filled($target['charge'] ?? null)) {
            $payload['charge'] = $target['charge'];
        } else {
            throw new RuntimeException(__('dashboard.Could not refund this invoice.'));
        }

        $response = Http::asForm()
            ->withToken($secret)
            ->acceptJson()
            ->timeout(20)
            ->post('https://api.stripe.com/v1/refunds', $payload);

        if (! $this->stripeRefundOk($response)) {
            throw new RuntimeException((string) ($response->json('error.message') ?? __('dashboard.Could not refund this invoice.')));
        }

        $subscription = $target['subscription'] ?? $invoice->provider_subscription_id;
        $this->cancelSubscription(is_string($subscription) ? $subscription : null);
    }

    public function cancelSubscription(?string $subscriptionId): void
    {
        $subscriptionId = trim((string) $subscriptionId);
        if ($subscriptionId === '' || ! str_starts_with($subscriptionId, 'sub_')) {
            return;
        }

        $secret = $this->store->credentials(PaymentCatalog::STRIPE)['secret_key'];
        if ($secret === '') {
            return;
        }

        Http::withToken($secret)
            ->acceptJson()
            ->timeout(20)
            ->delete('https://api.stripe.com/v1/subscriptions/'.$subscriptionId);
    }

    /**
     * @return array{payment_intent?: string, charge?: string, subscription?: string}
     */
    private function refundTarget(string $secret, string $id): array
    {
        if (str_starts_with($id, 'pi_')) {
            return ['payment_intent' => $id];
        }

        if (str_starts_with($id, 'ch_') || str_starts_with($id, 'py_')) {
            return ['charge' => $id];
        }

        if (str_starts_with($id, 'cs_')) {
            return $this->targetFromStripeGet($secret, 'https://api.stripe.com/v1/checkout/sessions/'.$id);
        }

        $fromInvoice = $this->targetFromStripeGet($secret, 'https://api.stripe.com/v1/invoices/'.$id, false);
        if ($fromInvoice !== []) {
            return $fromInvoice;
        }

        if (str_starts_with($id, 'in_')) {
            throw new RuntimeException(__('dashboard.Could not refund this invoice.'));
        }

        return $this->targetFromStripeGet($secret, 'https://api.stripe.com/v1/checkout/sessions/'.$id);
    }

    /**
     * @return array{payment_intent?: string, charge?: string, subscription?: string}
     */
    private function targetFromStripeGet(string $secret, string $url, bool $fail = true): array
    {
        $response = Http::withToken($secret)
            ->acceptJson()
            ->timeout(20)
            ->get($url);

        if (! $response->successful()) {
            if ($fail) {
                throw new RuntimeException((string) ($response->json('error.message') ?? __('dashboard.Could not refund this invoice.')));
            }

            return [];
        }

        $paymentIntent = $response->json('payment_intent');
        $charge = $response->json('charge');
        $subscription = $response->json('subscription');

        return array_filter([
            'payment_intent' => is_string($paymentIntent) ? $paymentIntent : null,
            'charge' => is_string($charge) ? $charge : null,
            'subscription' => is_string($subscription) ? $subscription : null,
        ]);
    }

    private function stripeRefundOk(Response $response): bool
    {
        if ($response->successful()) {
            return true;
        }

        $code = (string) $response->json('error.code');
        $message = strtolower((string) $response->json('error.message'));

        return $code === 'charge_already_refunded'
            || str_contains($message, 'already been refunded')
            || str_contains($message, 'already refunded');
    }
}
