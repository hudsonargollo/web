<?php

namespace App\Finance;

use App\Entitlement\PlanAssigner;
use App\Models\Invoice;
use App\Models\User;
use App\Payments\Drivers\PaypalGateway;
use App\Payments\Drivers\StripeGateway;
use App\Payments\PaymentCatalog;
use RuntimeException;

final class InvoiceRefundDesk
{
    public function __construct(
        private readonly StripeGateway $stripe,
        private readonly PaypalGateway $paypal,
        private readonly PlanAssigner $assigner,
    ) {}

    public function refund(Invoice $invoice, ?User $actor = null): Invoice
    {
        if (! $invoice->canRefund()) {
            throw new RuntimeException(__('dashboard.This invoice cannot be refunded.'));
        }

        if (blank($invoice->provider_invoice_id)) {
            throw new RuntimeException(__('dashboard.This invoice has no provider reference.'));
        }

        match ($invoice->driver) {
            PaymentCatalog::STRIPE => $this->stripe->refund($invoice),
            PaymentCatalog::PAYPAL => $this->paypal->refund($invoice),
            default => throw new RuntimeException(__('dashboard.This invoice cannot be refunded.')),
        };

        $invoice->forceFill([
            'status' => InvoiceStatus::Refunded,
            'refunded_at' => now(),
            'refunded_by' => $actor?->id,
        ])->save();

        $this->releasePack($invoice);

        return $invoice->fresh(['user', 'plan', 'entitlement', 'refundedBy', 'events']) ?? $invoice;
    }

    private function releasePack(Invoice $invoice): void
    {
        $user = $invoice->user;
        if ($user === null) {
            return;
        }

        $entitlement = $invoice->entitlement ?? $user->entitlement;
        if ($entitlement === null) {
            return;
        }

        $sameSubscription = filled($invoice->provider_subscription_id)
            && $invoice->provider_subscription_id === $entitlement->provider_subscription_id;
        $samePlan = $invoice->entitlement_plan_id !== null
            && (int) $invoice->entitlement_plan_id === (int) $entitlement->entitlement_plan_id;

        if (! $sameSubscription && ! $samePlan) {
            return;
        }

        $this->assigner->assignBySlug($user, 'free', [
            'status' => SubscriptionStatus::Active,
            'driver' => null,
            'provider_subscription_id' => null,
            'last_paid_at' => null,
            'ends_at' => now(),
        ]);
    }
}
