<?php

namespace App\Entitlement;

use App\Models\EntitlementPlan;
use App\Models\User;
use App\Models\UserEntitlement;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class PlanAssigner
{
    public function __construct(
        private readonly PlanCatalogSync $catalog,
    ) {}

    public function ensureCatalog(): void
    {
        if (! Schema::hasTable('entitlement_plans')) {
            return;
        }

        if (EntitlementPlan::query()->doesntExist()) {
            $this->catalog->sync();
        }

        $this->catalog->ensureMissingGrants();
    }

    public function ensureDefault(User $user): UserEntitlement
    {
        $this->ensureCatalog();

        $existing = $user->entitlement;

        if ($existing !== null) {
            return $existing;
        }

        $plan = EntitlementPlan::query()
            ->where('is_default', true)
            ->where('is_active', true)
            ->first()
            ?? EntitlementPlan::query()->where('slug', 'free')->firstOrFail();

        return $this->assign($user, $plan);
    }

    public function assignBySlug(User $user, string $slug, array $attributes = []): UserEntitlement
    {
        $this->ensureCatalog();

        $plan = EntitlementPlan::query()->where('slug', $slug)->first();

        if ($plan === null) {
            throw new InvalidArgumentException('Unknown entitlement pack.');
        }

        return $this->assign($user, $plan, $attributes);
    }

    public function assignByPublicId(User $user, string $publicId): UserEntitlement
    {
        $this->ensureCatalog();

        $plan = EntitlementPlan::query()->where('public_id', $publicId)->first();

        if ($plan === null) {
            throw new InvalidArgumentException('Unknown entitlement pack.');
        }

        return $this->assign($user, $plan);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function assign(User $user, EntitlementPlan $plan, array $attributes = []): UserEntitlement
    {
        $currentId = $user->entitlement?->entitlement_plan_id;

        if ($plan->isLocked() && (int) $currentId !== (int) $plan->id) {
            throw new InvalidArgumentException('This pack is locked.');
        }

        $entitlement = UserEntitlement::query()->firstOrNew(['user_id' => $user->id]);
        if (blank($entitlement->public_id)) {
            $entitlement->public_id = (string) Str::ulid();
        }
        $entitlement->fill(array_merge([
            'entitlement_plan_id' => $plan->id,
            'status' => 'active',
            'started_at' => now(),
            'ends_at' => null,
        ], $attributes))->save();

        $user->setRelation('entitlement', $entitlement->load('plan.grants'));

        return $entitlement;
    }
}
