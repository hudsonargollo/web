<?php

namespace App\Payments;

/**
 * Built-in payment methods. Stripe and PayPal only for now.
 */
final class PaymentCatalog
{
    public const STRIPE = 'stripe';

    public const PAYPAL = 'paypal';

    /**
     * @return list<string>
     */
    public static function drivers(): array
    {
        return [self::STRIPE, self::PAYPAL];
    }

    /**
     * @return array{
     *     code: string,
     *     title: string,
     *     summary: string,
     *     public_label: string,
     *     secret_label: string,
     *     webhook_label: string
     * }|null
     */
    public static function definition(string $driver): ?array
    {
        return match ($driver) {
            self::STRIPE => [
                'code' => self::STRIPE,
                'title' => 'Stripe',
                'summary' => 'Cards and wallets through Stripe Checkout.',
                'public_label' => 'Publishable key',
                'secret_label' => 'Secret key',
                'webhook_label' => 'Webhook signing secret',
            ],
            self::PAYPAL => [
                'code' => self::PAYPAL,
                'title' => 'PayPal',
                'summary' => 'PayPal Checkout with REST credentials.',
                'public_label' => 'Client ID',
                'secret_label' => 'Client secret',
                'webhook_label' => 'Webhook ID',
            ],
            default => null,
        };
    }

    /**
     * @return list<array{label: string, url: string}>
     */
    public static function manageLinks(string $driver, string $mode = 'test'): array
    {
        $live = $mode === 'live';

        return match ($driver) {
            self::STRIPE => [
                [
                    'label' => 'Manage in Stripe',
                    'url' => $live ? 'https://dashboard.stripe.com' : 'https://dashboard.stripe.com/test',
                ],
                [
                    'label' => 'API keys',
                    'url' => $live ? 'https://dashboard.stripe.com/apikeys' : 'https://dashboard.stripe.com/test/apikeys',
                ],
                [
                    'label' => 'Webhooks',
                    'url' => $live ? 'https://dashboard.stripe.com/webhooks' : 'https://dashboard.stripe.com/test/webhooks',
                ],
                [
                    'label' => 'Payments',
                    'url' => $live ? 'https://dashboard.stripe.com/payments' : 'https://dashboard.stripe.com/test/payments',
                ],
                [
                    'label' => 'Products',
                    'url' => $live ? 'https://dashboard.stripe.com/products' : 'https://dashboard.stripe.com/test/products',
                ],
            ],
            self::PAYPAL => [
                [
                    'label' => 'Manage in PayPal',
                    'url' => $live
                        ? 'https://www.paypal.com/businessmanage/account/accountAccess'
                        : 'https://www.sandbox.paypal.com',
                ],
                [
                    'label' => 'Developer dashboard',
                    'url' => 'https://developer.paypal.com/dashboard',
                ],
                [
                    'label' => 'Apps',
                    'url' => $live
                        ? 'https://developer.paypal.com/dashboard/applications/live'
                        : 'https://developer.paypal.com/dashboard/applications/sandbox',
                ],
                [
                    'label' => 'Webhooks',
                    'url' => $live
                        ? 'https://developer.paypal.com/dashboard/webhooks/live'
                        : 'https://developer.paypal.com/dashboard/webhooks/sandbox',
                ],
            ],
            default => [],
        };
    }
}
