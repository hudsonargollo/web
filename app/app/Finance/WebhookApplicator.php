<?php

namespace App\Finance;

use App\Entitlement\PlanAssigner;
use App\Models\EntitlementPlan;
use App\Models\Invoice;
use App\Models\PaymentWebhookEvent;
use App\Models\User;
use App\Models\UserEntitlement;
use App\Payments\PaymentCatalog;
use Illuminate\Support\Carbon;
use Throwable;

final class WebhookApplicator
{
    public function __construct(
        private readonly PlanAssigner $assigner,
        private readonly CreditIssuer $credits,
    ) {}

    public function apply(PaymentWebhookEvent $event): PaymentWebhookEvent
    {
        $event->attempts = (int) $event->attempts + 1;
        $event->last_error = null;

        try {
            $result = match ($event->driver) {
                PaymentCatalog::STRIPE => $this->applyStripe($event),
                PaymentCatalog::PAYPAL => $this->applyPaypal($event),
                default => ['status' => WebhookApplyStatus::Ignored],
            };

            $event->status = $result['status'];
            $event->invoice_id = $result['invoice']?->id ?? $event->invoice_id;
            $event->user_entitlement_id = $result['entitlement']?->id ?? $event->user_entitlement_id;
        } catch (Throwable $e) {
            $event->status = WebhookApplyStatus::Failed;
            $event->last_error = $e->getMessage();
        }

        $event->save();

        return $event;
    }

    /**
     * @return array{status: WebhookApplyStatus, invoice?: Invoice|null, entitlement?: UserEntitlement|null}
     */
    private function applyStripe(PaymentWebhookEvent $event): array
    {
        $payload = is_array($event->payload) ? $event->payload : [];
        $object = $this->object($payload);
        $type = (string) $event->event_type;

        return match (true) {
            $type === 'checkout.session.completed' => $this->applyCheckout($event, $object, [
                'provider_invoice_id' => $this->firstFilled($object, ['invoice', 'id']),
                'provider_subscription_id' => $this->string($object['subscription'] ?? null),
                'amount' => Money::fromStripeCents($object['amount_total'] ?? $object['amount_subtotal'] ?? 0),
                'currency' => strtoupper((string) ($object['currency'] ?? 'usd')),
                'status' => ($object['payment_status'] ?? 'paid') === 'unpaid'
                    ? InvoiceStatus::Open
                    : InvoiceStatus::Paid,
                'email' => $this->string($object['customer_email'] ?? $object['customer_details']['email'] ?? null),
                'public_id' => $this->string($object['client_reference_id'] ?? null),
                'metadata' => is_array($object['metadata'] ?? null) ? $object['metadata'] : [],
                'interval' => $this->intervalFromStripe($object),
                'description' => $type,
            ]),
            in_array($type, ['invoice.paid', 'invoice.payment_succeeded'], true) => $this->applyCheckout($event, $object, [
                'provider_invoice_id' => $this->string($object['id'] ?? null),
                'provider_subscription_id' => $this->string($object['subscription'] ?? null),
                'amount' => Money::fromStripeCents($object['amount_paid'] ?? $object['amount_due'] ?? 0),
                'currency' => strtoupper((string) ($object['currency'] ?? 'usd')),
                'status' => InvoiceStatus::Paid,
                'email' => $this->string($object['customer_email'] ?? null),
                'metadata' => is_array($object['metadata'] ?? null) ? $object['metadata'] : [],
                'interval' => $this->intervalFromStripe($object),
                'description' => $type,
            ]),
            $type === 'invoice.created' => $this->applyCheckout($event, $object, [
                'provider_invoice_id' => $this->string($object['id'] ?? null),
                'provider_subscription_id' => $this->string($object['subscription'] ?? null),
                'amount' => Money::fromStripeCents($object['amount_due'] ?? $object['total'] ?? 0),
                'currency' => strtoupper((string) ($object['currency'] ?? 'usd')),
                'status' => InvoiceStatus::Open,
                'email' => $this->string($object['customer_email'] ?? null),
                'metadata' => is_array($object['metadata'] ?? null) ? $object['metadata'] : [],
                'interval' => $this->intervalFromStripe($object),
                'description' => $type,
                'paid' => false,
            ]),
            $type === 'invoice.payment_failed' => $this->applyCheckout($event, $object, [
                'provider_invoice_id' => $this->string($object['id'] ?? null),
                'provider_subscription_id' => $this->string($object['subscription'] ?? null),
                'amount' => Money::fromStripeCents($object['amount_due'] ?? $object['total'] ?? 0),
                'currency' => strtoupper((string) ($object['currency'] ?? 'usd')),
                'status' => InvoiceStatus::Failed,
                'email' => $this->string($object['customer_email'] ?? null),
                'metadata' => is_array($object['metadata'] ?? null) ? $object['metadata'] : [],
                'interval' => $this->intervalFromStripe($object),
                'description' => $type,
                'paid' => false,
                'past_due' => true,
            ]),
            $type === 'charge.refunded' => $this->refundInvoice(
                PaymentCatalog::STRIPE,
                $this->firstFilled($object, ['invoice', 'id']),
            ),
            in_array($type, ['customer.subscription.updated', 'customer.subscription.created'], true) => $this->applySubscription($event, $object, $this->stripeSubscriptionStatus($object)),
            $type === 'customer.subscription.deleted' => $this->applySubscription($event, $object, SubscriptionStatus::Canceled),
            default => ['status' => WebhookApplyStatus::Ignored],
        };
    }

    /**
     * @return array{status: WebhookApplyStatus, invoice?: Invoice|null, entitlement?: UserEntitlement|null}
     */
    private function applyPaypal(PaymentWebhookEvent $event): array
    {
        $payload = is_array($event->payload) ? $event->payload : [];
        $resource = is_array($payload['resource'] ?? null) ? $payload['resource'] : [];
        $type = (string) $event->event_type;
        $unit = is_array($resource['purchase_units'][0] ?? null) ? $resource['purchase_units'][0] : [];
        $amountBag = is_array($resource['amount'] ?? null)
            ? $resource['amount']
            : (is_array($unit['amount'] ?? null) ? $unit['amount'] : []);

        return match (true) {
            in_array($type, ['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.SALE.COMPLETED'], true) => $this->applyCheckout($event, $resource, [
                'provider_invoice_id' => $this->firstFilled($resource, ['id'])
                    ?? $this->string($unit['invoice_id'] ?? null),
                'amount' => (float) ($amountBag['value'] ?? 0),
                'currency' => strtoupper((string) ($amountBag['currency_code'] ?? $amountBag['currency'] ?? 'USD')),
                'status' => InvoiceStatus::Paid,
                'email' => $this->string($resource['payer']['email_address'] ?? $payload['resource']['payer']['email_address'] ?? null),
                'public_id' => $this->string($resource['custom_id'] ?? $unit['custom_id'] ?? null),
                'metadata' => $this->paypalPackMeta($unit, $resource),
                'interval' => $this->intervalFromPaypal($unit, $resource),
                'description' => $type,
            ]),
            in_array($type, ['BILLING.SUBSCRIPTION.ACTIVATED', 'BILLING.SUBSCRIPTION.UPDATED'], true) => $this->applySubscription($event, $resource, SubscriptionStatus::Active, [
                'public_id' => $this->string($resource['custom_id'] ?? null),
                'email' => $this->string($resource['subscriber']['email_address'] ?? null),
            ]),
            $type === 'BILLING.SUBSCRIPTION.SUSPENDED' => $this->applySubscription($event, $resource, SubscriptionStatus::PastDue, [
                'public_id' => $this->string($resource['custom_id'] ?? null),
            ]),
            $type === 'BILLING.SUBSCRIPTION.CANCELLED' => $this->applySubscription($event, $resource, SubscriptionStatus::Canceled, [
                'public_id' => $this->string($resource['custom_id'] ?? null),
            ]),
            $type === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED' => $this->applyCheckout($event, $resource, [
                'provider_invoice_id' => $this->string($resource['id'] ?? null),
                'provider_subscription_id' => $this->string($resource['id'] ?? null),
                'amount' => (float) ($amountBag['value'] ?? $resource['billing_info']['last_failed_payment']['amount']['value'] ?? 0),
                'currency' => strtoupper((string) ($amountBag['currency_code'] ?? 'USD')),
                'status' => InvoiceStatus::Failed,
                'public_id' => $this->string($resource['custom_id'] ?? null),
                'description' => $type,
                'paid' => false,
                'past_due' => true,
            ]),
            in_array($type, ['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.SALE.REFUNDED'], true) => $this->refundInvoice(
                PaymentCatalog::PAYPAL,
                $this->string($resource['id'] ?? $resource['invoice_id'] ?? null),
            ),
            default => ['status' => WebhookApplyStatus::Ignored],
        };
    }

    /**
     * @param  array<string, mixed>  $object
     * @param  array<string, mixed>  $facts
     * @return array{status: WebhookApplyStatus, invoice: Invoice, entitlement: UserEntitlement|null}
     */
    private function applyCheckout(PaymentWebhookEvent $event, array $object, array $facts): array
    {
        $metadata = is_array($facts['metadata'] ?? null) ? $facts['metadata'] : [];
        $user = $this->findUser([
            'public_id' => $facts['public_id'] ?? $metadata['user_public_id'] ?? $metadata['user_id'] ?? null,
            'email' => $facts['email'] ?? $metadata['email'] ?? null,
        ]);
        $plan = $this->findPlan([
            'plan_public_id' => $metadata['plan_public_id'] ?? $metadata['pack_public_id'] ?? null,
            'plan_slug' => $metadata['plan_slug'] ?? $metadata['pack_slug'] ?? null,
        ]);

        $paid = ($facts['status'] ?? InvoiceStatus::Paid) === InvoiceStatus::Paid && ($facts['paid'] ?? true);
        $invoice = $this->upsertInvoice([
            'user_id' => $user?->id,
            'entitlement_plan_id' => $plan?->id,
            'user_entitlement_id' => $user?->entitlement?->id,
            'driver' => $event->driver,
            'provider_invoice_id' => $facts['provider_invoice_id'] ?? $event->provider_event_id ?? $event->public_id,
            'provider_subscription_id' => $facts['provider_subscription_id'] ?? null,
            'amount' => $facts['amount'] ?? 0,
            'currency' => $facts['currency'] ?? 'USD',
            'status' => $facts['status'] ?? InvoiceStatus::Paid,
            'paid_at' => $paid ? now() : null,
            'description' => $facts['description'] ?? $event->event_type,
        ]);

        $entitlement = null;

        if ($user !== null && $plan !== null && $paid) {
            $interval = $facts['interval'] ?? null;
            $entitlement = $this->assigner->assign($user, $plan, array_filter([
                'status' => SubscriptionStatus::Active->value,
                'driver' => $event->driver,
                'provider_subscription_id' => $facts['provider_subscription_id'] ?? null,
                'interval' => $interval instanceof BillingInterval ? $interval->value : $interval,
                'last_paid_at' => now(),
                'ends_at' => $this->periodEnd($interval instanceof BillingInterval ? $interval : BillingInterval::tryFrom((string) $interval)),
            ], fn (mixed $value) => $value !== null && $value !== ''));

            $invoice->forceFill([
                'user_entitlement_id' => $entitlement->id,
                'entitlement_plan_id' => $plan->id,
            ])->save();
        } elseif ($user !== null && ! empty($facts['past_due'])) {
            $entitlement = $user->entitlement;
            if ($entitlement !== null) {
                $entitlement->forceFill(['status' => SubscriptionStatus::PastDue])->save();
            }
        }

        $creditAmount = (int) ($metadata['credits'] ?? $metadata['lab_credits'] ?? 0);
        if ($user !== null && $paid && $creditAmount > 0) {
            $this->credits->issue($user, $creditAmount, CreditKind::Purchase, $event->event_type, null, $plan, $invoice);
        }

        return [
            'status' => WebhookApplyStatus::Applied,
            'invoice' => $invoice,
            'entitlement' => $entitlement,
        ];
    }

    /**
     * @param  array<string, mixed>  $object
     * @param  array<string, mixed>  $hints
     * @return array{status: WebhookApplyStatus, entitlement: UserEntitlement|null}
     */
    private function applySubscription(PaymentWebhookEvent $event, array $object, SubscriptionStatus $status, array $hints = []): array
    {
        $subscriptionId = $this->string($object['id'] ?? $object['subscription'] ?? null);
        $metadata = is_array($object['metadata'] ?? null) ? $object['metadata'] : [];
        $user = $this->findUser([
            'public_id' => $hints['public_id'] ?? $metadata['user_public_id'] ?? $metadata['user_id'] ?? null,
            'email' => $hints['email'] ?? $object['customer_email'] ?? null,
        ]);

        $entitlement = null;
        if ($user !== null) {
            $entitlement = $user->entitlement;
        } elseif (filled($subscriptionId)) {
            $entitlement = UserEntitlement::query()
                ->where('provider_subscription_id', $subscriptionId)
                ->first();
        }

        if ($entitlement === null) {
            return ['status' => WebhookApplyStatus::Ignored, 'entitlement' => null];
        }

        $periodEnd = $this->timestamp($object['current_period_end'] ?? $object['billing_info']['next_billing_time'] ?? null);
        $interval = $this->intervalFromStripe($object);

        $entitlement->fill(array_filter([
            'status' => $status,
            'driver' => $event->driver,
            'provider_subscription_id' => $subscriptionId,
            'interval' => $interval,
            'ends_at' => $status === SubscriptionStatus::Canceled ? now() : $periodEnd,
            'last_paid_at' => $status === SubscriptionStatus::Active ? ($entitlement->last_paid_at ?? now()) : $entitlement->last_paid_at,
        ], fn (mixed $value) => $value !== null && $value !== ''))->save();

        return [
            'status' => WebhookApplyStatus::Applied,
            'entitlement' => $entitlement,
        ];
    }

    /**
     * @return array{status: WebhookApplyStatus, invoice: Invoice|null}
     */
    private function refundInvoice(string $driver, ?string $providerInvoiceId): array
    {
        if (blank($providerInvoiceId)) {
            return ['status' => WebhookApplyStatus::Ignored, 'invoice' => null];
        }

        $invoice = Invoice::query()
            ->where('driver', $driver)
            ->where('provider_invoice_id', $providerInvoiceId)
            ->first();

        if ($invoice === null) {
            return ['status' => WebhookApplyStatus::Ignored, 'invoice' => null];
        }

        $invoice->forceFill([
            'status' => InvoiceStatus::Refunded,
            'refunded_at' => now(),
        ])->save();

        return ['status' => WebhookApplyStatus::Applied, 'invoice' => $invoice];
    }

    /**
     * @param  array<string, mixed>  $attrs
     */
    private function upsertInvoice(array $attrs): Invoice
    {
        $providerId = $attrs['provider_invoice_id'] ?? null;
        $existing = filled($providerId)
            ? Invoice::query()
                ->where('driver', $attrs['driver'])
                ->where('provider_invoice_id', $providerId)
                ->first()
            : null;

        if ($existing !== null) {
            if ($existing->status === InvoiceStatus::Refunded) {
                unset($attrs['status'], $attrs['paid_at']);
            }
            $existing->fill($attrs)->save();

            return $existing;
        }

        return Invoice::query()->create($attrs);
    }

    /**
     * @param  array{public_id?: mixed, email?: mixed}  $hints
     */
    private function findUser(array $hints): ?User
    {
        $publicId = $this->string($hints['public_id'] ?? null);
        if (filled($publicId)) {
            $user = User::query()->where('public_id', $publicId)->first();
            if ($user !== null) {
                return $user;
            }
        }

        $email = $this->string($hints['email'] ?? null);
        if (filled($email)) {
            return User::query()->where('email', $email)->first();
        }

        return null;
    }

    /**
     * @param  array{plan_public_id?: mixed, plan_slug?: mixed}  $hints
     */
    private function findPlan(array $hints): ?EntitlementPlan
    {
        $publicId = $this->string($hints['plan_public_id'] ?? null);
        if (filled($publicId)) {
            $plan = EntitlementPlan::query()->where('public_id', $publicId)->first();
            if ($plan !== null) {
                return $plan;
            }
        }

        $slug = $this->string($hints['plan_slug'] ?? null);
        if (filled($slug)) {
            return EntitlementPlan::query()->where('slug', $slug)->first();
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function object(array $payload): array
    {
        $object = $payload['data']['object'] ?? $payload['object'] ?? $payload;

        return is_array($object) ? $object : [];
    }

    /**
     * @param  array<string, mixed>  $object
     */
    private function intervalFromStripe(array $object): ?BillingInterval
    {
        $raw = $object['items']['data'][0]['price']['recurring']['interval']
            ?? $object['lines']['data'][0]['price']['recurring']['interval']
            ?? $object['plan']['interval']
            ?? $object['metadata']['interval']
            ?? null;

        return match ($raw) {
            'month', 'monthly' => BillingInterval::Monthly,
            'year', 'yearly' => BillingInterval::Yearly,
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $unit
     * @param  array<string, mixed>  $resource
     * @return array<string, string>
     */
    private function paypalPackMeta(array $unit, array $resource): array
    {
        $ref = $this->string($unit['reference_id'] ?? $resource['reference_id'] ?? null);
        if ($ref === null || ! str_contains($ref, ':')) {
            return [];
        }

        [$slug, $interval] = array_pad(explode(':', $ref, 2), 2, '');

        return array_filter([
            'plan_slug' => $slug,
            'interval' => $interval,
        ]);
    }

    /**
     * @param  array<string, mixed>  $unit
     * @param  array<string, mixed>  $resource
     */
    private function intervalFromPaypal(array $unit, array $resource): ?BillingInterval
    {
        $meta = $this->paypalPackMeta($unit, $resource);

        return match ($meta['interval'] ?? null) {
            'month', 'monthly' => BillingInterval::Monthly,
            'year', 'yearly' => BillingInterval::Yearly,
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $object
     */
    private function stripeSubscriptionStatus(array $object): SubscriptionStatus
    {
        return match ((string) ($object['status'] ?? 'active')) {
            'past_due', 'unpaid', 'incomplete' => SubscriptionStatus::PastDue,
            'canceled', 'cancelled', 'incomplete_expired' => SubscriptionStatus::Canceled,
            default => SubscriptionStatus::Active,
        };
    }

    private function periodEnd(?BillingInterval $interval): ?Carbon
    {
        return match ($interval) {
            BillingInterval::Yearly => now()->addYear(),
            BillingInterval::Monthly => now()->addMonth(),
            default => null,
        };
    }

    private function timestamp(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return Carbon::createFromTimestamp((int) $value);
        }

        try {
            return Carbon::parse((string) $value);
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $bag
     * @param  list<string>  $keys
     */
    private function firstFilled(array $bag, array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = $this->string($bag[$key] ?? null);
            if (filled($value)) {
                return $value;
            }
        }

        return null;
    }

    private function string(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }
}
