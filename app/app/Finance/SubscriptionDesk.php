<?php

namespace App\Finance;

use App\Entitlement\PlanAssigner;
use App\Models\EntitlementPlan;
use App\Models\UserEntitlement;

final class SubscriptionDesk
{
    public function __construct(
        private readonly PlanAssigner $assigner,
    ) {}

    public function changePack(UserEntitlement $row, EntitlementPlan $plan): UserEntitlement
    {
        $user = $row->user;
        $status = $row->status === SubscriptionStatus::Canceled
            ? SubscriptionStatus::Active
            : $row->status;

        return $this->assigner->assign($user, $plan, [
            'started_at' => $row->started_at ?? now(),
            'ends_at' => $row->ends_at,
            'interval' => $row->interval,
            'provider_subscription_id' => $row->provider_subscription_id,
            'driver' => $row->driver,
            'last_paid_at' => $row->last_paid_at,
            'status' => $status,
        ]);
    }

    public function cancel(UserEntitlement $row): void
    {
        $row->forceFill([
            'status' => SubscriptionStatus::Canceled,
            'ends_at' => now(),
        ])->save();
    }

    public function extend(UserEntitlement $row): void
    {
        $from = $row->ends_at !== null && $row->ends_at->isFuture()
            ? $row->ends_at->copy()
            : now();

        $row->forceFill([
            'ends_at' => $row->interval === BillingInterval::Yearly
                ? $from->addYear()
                : $from->addMonth(),
            'status' => $row->status === SubscriptionStatus::Canceled
                ? SubscriptionStatus::Active
                : $row->status,
        ])->save();
    }
}
