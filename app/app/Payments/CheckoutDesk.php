<?php

namespace App\Payments;

use App\Finance\BillingInterval;
use App\Finance\Money;
use App\Models\EntitlementPlan;
use App\Models\User;
use App\Payments\Drivers\PaypalGateway;
use App\Payments\Drivers\StripeGateway;
use Cknow\Money\Money as MoneyValue;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;

final class CheckoutDesk
{
    public function __construct(
        private readonly PaymentGatewayStore $store,
        private readonly StripeGateway $stripe,
        private readonly PaypalGateway $paypal,
    ) {}

    /**
     * @return list<array{driver: string, title: string}>
     */
    public function readyDrivers(): array
    {
        $out = [];
        foreach (PaymentCatalog::drivers() as $driver) {
            $row = $this->store->get($driver);
            if ($row['ready']) {
                $out[] = [
                    'driver' => $driver,
                    'title' => $row['title'],
                ];
            }
        }

        return $out;
    }

    public function defaultDriver(): ?string
    {
        $ready = $this->readyDrivers();

        return $ready[0]['driver'] ?? null;
    }

    public function interval(string $raw): BillingInterval
    {
        return match ($raw) {
            'year', 'yearly' => BillingInterval::Yearly,
            default => BillingInterval::Monthly,
        };
    }

    public function price(EntitlementPlan $plan, BillingInterval $interval): MoneyValue
    {
        $amount = $interval === BillingInterval::Yearly ? $plan->price_yearly : $plan->price_monthly;
        if (! $amount instanceof MoneyValue || $amount->isZero() || $amount->isNegative()) {
            throw new InvalidArgumentException(__('dashboard.This pack is not available for checkout.'));
        }

        return $amount;
    }

    /**
     * @return array{url: string, driver: string}
     */
    public function start(User $user, EntitlementPlan $plan, BillingInterval $interval, ?string $driver = null): array
    {
        if (! $plan->is_active) {
            throw new InvalidArgumentException(__('dashboard.This pack is not available for checkout.'));
        }

        $price = $this->price($plan, $interval);
        $driver = $driver ?: $this->defaultDriver();
        if ($driver === null) {
            throw new RuntimeException(__('dashboard.Checkout is not configured.'));
        }

        if (! in_array($driver, array_column($this->readyDrivers(), 'driver'), true)) {
            throw new RuntimeException(__('dashboard.Checkout is not configured.'));
        }

        return match ($driver) {
            PaymentCatalog::STRIPE => $this->startStripe($user, $plan, $interval, $price),
            PaymentCatalog::PAYPAL => $this->startPaypal($user, $plan, $interval, $price),
            default => throw new InvalidArgumentException(__('dashboard.Checkout is not configured.')),
        };
    }

    /**
     * @return array{url: string, driver: string}
     */
    private function startStripe(User $user, EntitlementPlan $plan, BillingInterval $interval, MoneyValue $price): array
    {
        $row = $this->store->get(PaymentCatalog::STRIPE);
        $currency = strtolower($price->getCurrency()->getCode() ?: Money::defaultCurrency());
        $payload = [
            'mode' => 'subscription',
            'success_url' => route('billing.return'),
            'cancel_url' => route('billing.cancel'),
            'client_reference_id' => $user->public_id,
            'customer_email' => $user->email,
            'allow_promotion_codes' => 'true',
            'line_items[0][quantity]' => 1,
            'line_items[0][price_data][currency]' => $currency,
            'line_items[0][price_data][unit_amount]' => (int) $price->getAmount(),
            'line_items[0][price_data][product_data][name]' => $plan->title,
            'line_items[0][price_data][recurring][interval]' => $interval === BillingInterval::Yearly ? 'year' : 'month',
            'metadata[user_public_id]' => $user->public_id,
            'metadata[plan_public_id]' => $plan->public_id,
            'metadata[plan_slug]' => $plan->slug,
            'metadata[interval]' => $interval->value,
            'subscription_data[metadata][user_public_id]' => $user->public_id,
            'subscription_data[metadata][plan_slug]' => $plan->slug,
            'subscription_data[metadata][interval]' => $interval->value,
        ];

        $response = Http::asForm()
            ->withToken($row['secret_key'])
            ->acceptJson()
            ->timeout(20)
            ->post('https://api.stripe.com/v1/checkout/sessions', $payload);

        if (! $response->successful()) {
            $message = (string) ($response->json('error.message') ?? __('dashboard.Could not start checkout.'));

            throw new RuntimeException($message);
        }

        $id = (string) $response->json('id');
        $url = (string) $response->json('url');
        if ($url === '' || $id === '') {
            throw new RuntimeException(__('dashboard.Could not start checkout.'));
        }

        session()->forget(['billing.paid', 'checkout.paypal_order', 'checkout.plan_slug', 'checkout.interval']);
        session(['checkout.stripe_session' => $id]);

        return ['url' => $url, 'driver' => PaymentCatalog::STRIPE];
    }

    /**
     * @return array{url: string, driver: string}
     */
    private function startPaypal(User $user, EntitlementPlan $plan, BillingInterval $interval, MoneyValue $price): array
    {
        $token = $this->paypal->accessToken();
        if ($token === null) {
            throw new RuntimeException(__('dashboard.Checkout is not configured.'));
        }

        $row = $this->store->get(PaymentCatalog::PAYPAL);
        $base = $row['mode'] === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(20)
            ->post($base.'/v2/checkout/orders', [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'custom_id' => $user->public_id,
                    'reference_id' => $plan->slug.':'.$interval->value,
                    'description' => $plan->title.' ('.$interval->value.')',
                    'amount' => [
                        'currency_code' => strtoupper($price->getCurrency()->getCode() ?: Money::defaultCurrency()),
                        'value' => $price->formatByDecimal(),
                    ],
                ]],
                'application_context' => [
                    'brand_name' => config('app.name', 'Krikkit'),
                    'user_action' => 'PAY_NOW',
                    'return_url' => route('billing.paypal.return'),
                    'cancel_url' => route('billing.cancel'),
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException((string) ($response->json('message') ?? __('dashboard.Could not start checkout.')));
        }

        $url = '';
        foreach ($response->json('links') ?? [] as $link) {
            if (($link['rel'] ?? '') === 'approve' && filled($link['href'] ?? null)) {
                $url = (string) $link['href'];
                break;
            }
        }

        if ($url === '') {
            throw new RuntimeException(__('dashboard.Could not start checkout.'));
        }

        session()->forget(['billing.paid', 'checkout.stripe_session']);
        session([
            'checkout.paypal_order' => (string) $response->json('id'),
            'checkout.plan_slug' => $plan->slug,
            'checkout.interval' => $interval->value,
        ]);

        return ['url' => $url, 'driver' => PaymentCatalog::PAYPAL];
    }

    public function claimPaidReturn(User $user): bool
    {
        if (session('billing.paid') === true) {
            return true;
        }

        $sessionId = (string) session('checkout.stripe_session', '');
        if ($sessionId === '') {
            return false;
        }

        $row = $this->store->get(PaymentCatalog::STRIPE);
        $response = Http::withToken($row['secret_key'])
            ->acceptJson()
            ->timeout(20)
            ->get('https://api.stripe.com/v1/checkout/sessions/'.$sessionId);

        if (! $response->successful()) {
            return false;
        }

        $reference = (string) $response->json('client_reference_id');
        $status = (string) $response->json('status');
        $payment = (string) $response->json('payment_status');

        if ($reference !== $user->public_id) {
            return false;
        }

        if ($status !== 'complete' && $payment !== 'paid') {
            return false;
        }

        session(['billing.paid' => true]);
        session()->forget('checkout.stripe_session');

        return true;
    }
}
