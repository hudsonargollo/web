<?php

namespace App\Finance;

final class FinanceCopy
{
    /**
     * @return array{label: string, color: string}
     */
    public static function subscription(SubscriptionStatus|string|null $status): array
    {
        $value = $status instanceof SubscriptionStatus ? $status : SubscriptionStatus::tryFrom((string) $status);

        return match ($value) {
            SubscriptionStatus::PastDue => ['label' => __('dashboard.Past due'), 'color' => 'amber'],
            SubscriptionStatus::Canceled => ['label' => __('dashboard.Canceled'), 'color' => 'zinc'],
            default => ['label' => __('dashboard.Active'), 'color' => 'teal'],
        };
    }

    /**
     * @return array{label: string, color: string}
     */
    public static function invoice(InvoiceStatus|string|null $status): array
    {
        $value = $status instanceof InvoiceStatus ? $status : InvoiceStatus::tryFrom((string) $status);

        return match ($value) {
            InvoiceStatus::Open => ['label' => __('dashboard.Open'), 'color' => 'blue'],
            InvoiceStatus::Failed => ['label' => __('dashboard.Failed'), 'color' => 'red'],
            InvoiceStatus::Refunded => ['label' => __('dashboard.Refunded'), 'color' => 'zinc'],
            default => ['label' => __('dashboard.Paid'), 'color' => 'teal'],
        };
    }

    /**
     * @return array{label: string, color: string}
     */
    public static function event(WebhookApplyStatus|string|null $status): array
    {
        $value = $status instanceof WebhookApplyStatus ? $status : WebhookApplyStatus::tryFrom((string) $status);

        return match ($value) {
            WebhookApplyStatus::Applied => ['label' => __('dashboard.Applied'), 'color' => 'teal'],
            WebhookApplyStatus::Ignored => ['label' => __('dashboard.Ignored'), 'color' => 'zinc'],
            WebhookApplyStatus::Failed => ['label' => __('dashboard.Failed'), 'color' => 'red'],
            default => ['label' => __('dashboard.Received'), 'color' => 'blue'],
        };
    }

    public static function interval(BillingInterval|string|null $interval): string
    {
        $value = $interval instanceof BillingInterval ? $interval : BillingInterval::tryFrom((string) $interval);

        return match ($value) {
            BillingInterval::Yearly => __('dashboard.Yearly'),
            BillingInterval::Monthly => __('dashboard.Monthly'),
            default => '—',
        };
    }

    public static function driver(string $driver): string
    {
        return match ($driver) {
            'stripe' => 'Stripe',
            'paypal' => 'PayPal',
            default => $driver,
        };
    }

    public static function creditKind(CreditKind|string|null $kind): string
    {
        $value = $kind instanceof CreditKind ? $kind : CreditKind::tryFrom((string) $kind);

        return match ($value) {
            CreditKind::Purchase => __('dashboard.Purchase'),
            CreditKind::Topup => __('dashboard.Top-up'),
            CreditKind::Adjustment => __('dashboard.Adjustment'),
            default => __('dashboard.Manual grant'),
        };
    }
}
