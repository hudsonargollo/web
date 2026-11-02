<?php

namespace App\Finance;

use App\Entitlement\EntitlementCatalog;
use App\Models\CreditGrant;
use App\Models\EntitlementPlan;
use App\Models\Invoice;
use App\Models\User;
use InvalidArgumentException;

final class CreditIssuer
{
    public function issue(
        User $user,
        int $amount,
        CreditKind $kind,
        ?string $reason = null,
        ?User $actor = null,
        ?EntitlementPlan $plan = null,
        ?Invoice $invoice = null,
    ): CreditGrant {
        if ($amount === 0) {
            throw new InvalidArgumentException('Credit amount cannot be zero.');
        }

        if ($kind === CreditKind::Grant && $amount < 1) {
            throw new InvalidArgumentException('Manual grants must add credits.');
        }

        return CreditGrant::query()->create([
            'user_id' => $user->id,
            'amount' => $amount,
            'kind' => $kind,
            'reason' => filled($reason) ? trim($reason) : null,
            'granted_by' => $actor?->id,
            'entitlement_plan_id' => $plan?->id,
            'invoice_id' => $invoice?->id,
        ]);
    }

    public function topUp(User $user, EntitlementPlan $plan, ?string $reason, ?User $actor): CreditGrant
    {
        $grant = $plan->grantFor(EntitlementCatalog::LAB_CREDITS);
        $amount = $grant?->isUnlimited() ? 0 : (int) ($grant?->ceiling ?? 0);

        if ($amount < 1) {
            throw new InvalidArgumentException('This pack has no credit top-up.');
        }

        return $this->issue(
            $user,
            $amount,
            CreditKind::Topup,
            $reason ?: $plan->title,
            $actor,
            $plan,
        );
    }
}
