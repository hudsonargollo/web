<?php

namespace App\Entitlement;

use App\Entitlement\Exceptions\EntitlementDeniedException;
use App\Models\CreditGrant;
use App\Models\EntitlementPlan;
use App\Models\LabProject;
use App\Models\PlanGrant;
use App\Models\UsageLedger;
use App\Models\User;
use Cknow\Money\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class EntitlementGate
{
    public function __construct(
        private readonly PlanAssigner $assigner,
    ) {}

    public function planFor(User $user): EntitlementPlan
    {
        $entitlement = $this->assigner->ensureDefault($user);
        $entitlement->loadMissing('plan.grants');

        return $entitlement->plan;
    }

    public function allows(User $user, string $code): bool
    {
        $grant = $this->grant($user, $code);

        if ($grant === null) {
            return false;
        }

        if ($grant->kind === GrantKind::Feature) {
            return $grant->allowed;
        }

        if ($grant->isUnlimited()) {
            return true;
        }

        $limit = $this->quotaLimit($user, $code, $grant);

        return $limit !== null && $this->used($user, $code) < $limit;
    }

    public function assertFeature(User $user, string $code): void
    {
        $grant = $this->grant($user, $code);

        if ($grant !== null && $grant->kind === GrantKind::Feature && $grant->allowed) {
            return;
        }

        throw EntitlementDeniedException::feature(
            $this->featureMessage($user, $code),
            $this->denialPayload($user, $code),
        );
    }

    public function assertQuota(User $user, string $code, int $amount = 1): void
    {
        $grant = $this->grant($user, $code);

        if ($grant === null || $grant->kind !== GrantKind::Quota) {
            throw EntitlementDeniedException::quota(
                $this->quotaMessage($user, $code),
                $this->denialPayload($user, $code),
            );
        }

        if ($grant->isUnlimited()) {
            return;
        }

        $used = $this->used($user, $code);
        $limit = $this->quotaLimit($user, $code, $grant);

        if ($limit === null || $used + $amount > $limit) {
            throw EntitlementDeniedException::quota(
                $this->quotaMessage($user, $code),
                $this->denialPayload($user, $code, $used),
            );
        }
    }

    public function consume(User $user, string $code, int $amount = 1): void
    {
        $definition = EntitlementCatalog::definition($code);

        DB::transaction(function () use ($user, $code, $amount, $definition): void {
            $this->assertQuota($user, $code, $amount);

            if (($definition['meter'] ?? 'ledger') !== 'ledger') {
                return;
            }

            $this->adjustLedger($user, $code, $amount);
        });
    }

    public function refund(User $user, string $code, int $amount = 1): void
    {
        $definition = EntitlementCatalog::definition($code);

        if (($definition['meter'] ?? 'ledger') !== 'ledger') {
            return;
        }

        $this->adjustLedger($user, $code, -$amount);
    }

    /**
     * Record actual ledger spend after the work is done (no pre-flight assert).
     * A single turn may overshoot the ceiling; the next request is 402.
     */
    public function settle(User $user, string $code, int $amount): void
    {
        if ($amount <= 0) {
            return;
        }

        $definition = EntitlementCatalog::definition($code);

        if (($definition['meter'] ?? 'ledger') !== 'ledger') {
            return;
        }

        $this->adjustLedger($user, $code, $amount);
    }

    /**
     * @return array{used: int, limit: int|null, remaining: int|null, unlimited: bool, window: string}|null
     */
    public function creditSnapshot(User $user): ?array
    {
        return $this->snapshot($user)['credits'] ?? null;
    }

    public function used(User $user, string $code): int
    {
        $definition = EntitlementCatalog::definition($code);

        if (($definition['meter'] ?? 'ledger') === 'projects') {
            return LabProject::query()->where('user_id', $user->id)->count();
        }

        if (($definition['meter'] ?? 'ledger') !== 'ledger') {
            return 0;
        }

        $window = $this->windowFor($user, $code);

        return (int) UsageLedger::query()
            ->where('user_id', $user->id)
            ->where('code', $code)
            ->where('window_key', $window->periodKey())
            ->value('consumed');
    }

    /**
     * @return array{
     *     plan: array{slug: string, title: string, public_id: string, rank: int},
     *     features: array<string, bool>,
     *     quotas: array<string, array{used: int, limit: int|null, remaining: int|null, unlimited: bool, window: string}>,
     *     credits: array{used: int, limit: int|null, remaining: int|null, unlimited: bool, window: string}|null,
     *     upgrade_url: string
     * }
     */
    public function snapshot(User $user): array
    {
        $plan = $this->planFor($user);
        $features = [];
        $quotas = [];

        foreach (EntitlementCatalog::definitions() as $definition) {
            $code = $definition['code'];
            $grant = $plan->grantFor($code);

            if ($definition['kind'] === GrantKind::Feature) {
                $features[$code] = (bool) ($grant?->allowed);

                continue;
            }

            $unlimited = $grant?->isUnlimited() ?? false;
            $limit = $unlimited ? null : $this->quotaLimit($user, $code, $grant);
            $used = $this->used($user, $code);
            $remaining = $unlimited || $limit === null ? null : max(0, (int) $limit - $used);

            $quotas[$code] = [
                'used' => $used,
                'limit' => $limit,
                'remaining' => $remaining,
                'unlimited' => $unlimited,
                'window' => ($grant?->window ?? $definition['window'])->value,
            ];
        }

        $suggested = $this->suggestedPlan($plan);
        $credits = $quotas[EntitlementCatalog::LAB_CREDITS] ?? null;

        return [
            'plan' => [
                'slug' => $plan->slug,
                'title' => $plan->title,
                'public_id' => $plan->public_id,
                'rank' => $plan->rank,
            ],
            'suggested_plan' => $suggested === null ? null : [
                'slug' => $suggested->slug,
                'title' => $suggested->title,
                'public_id' => $suggested->public_id,
            ],
            'features' => $features,
            'quotas' => $quotas,
            'credits' => $credits,
            'upgrade_url' => $this->upgradeHref($suggested),
        ];
    }

    public function suggestedPlan(EntitlementPlan $current): ?EntitlementPlan
    {
        return EntitlementPlan::query()
            ->where('is_active', true)
            ->where('rank', '>', $current->rank)
            ->orderBy('rank')
            ->first();
    }

    public function upgradeHref(?EntitlementPlan $plan): string
    {
        if ($plan === null) {
            return route('pricing');
        }

        if ($this->isGratis($plan)) {
            return route('contact', ['pack' => $plan->public_id]);
        }

        return route('checkout.start', $plan);
    }

    private function isGratis(EntitlementPlan $plan): bool
    {
        $monthly = $plan->price_monthly;
        $yearly = $plan->price_yearly;
        $monthlyOpen = ! $monthly instanceof Money || $monthly->isZero() || $monthly->isNegative();
        $yearlyOpen = ! $yearly instanceof Money || $yearly->isZero() || $yearly->isNegative();

        return $monthlyOpen && $yearlyOpen;
    }

    public function grant(User $user, string $code): ?PlanGrant
    {
        $plan = $this->planFor($user);

        return PlanGrant::query()
            ->where('entitlement_plan_id', $plan->id)
            ->where('code', $code)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    public function denialPayload(User $user, string $code, ?int $used = null): array
    {
        $plan = $this->planFor($user);
        $grant = $plan->grantFor($code);
        $definition = EntitlementCatalog::definition($code);
        $kind = $grant?->kind ?? $definition['kind'] ?? GrantKind::Feature;
        $used ??= $kind === GrantKind::Quota ? $this->used($user, $code) : null;
        $unlimited = $grant?->isUnlimited() ?? false;
        $limit = $unlimited ? null : $this->quotaLimit($user, $code, $grant);
        $suggested = $this->suggestedPlan($plan);

        return [
            'key' => $code,
            'kind' => $kind->value,
            'title' => EntitlementCatalog::title($code),
            'allowed' => $kind === GrantKind::Feature ? (bool) $grant?->allowed : false,
            'limit' => $limit,
            'used' => $used,
            'remaining' => $unlimited || $limit === null || $used === null
                ? null
                : max(0, (int) $limit - (int) $used),
            'unlimited' => $unlimited,
            'window' => ($grant?->window ?? $definition['window'] ?? UsageWindow::None)->value,
            'plan' => [
                'slug' => $plan->slug,
                'title' => $plan->title,
                'public_id' => $plan->public_id,
            ],
            'suggested_plan' => $suggested === null ? null : [
                'slug' => $suggested->slug,
                'title' => $suggested->title,
                'public_id' => $suggested->public_id,
            ],
            'upgrade_url' => $this->upgradeHref($suggested),
        ];
    }

    private function featureMessage(User $user, string $code): string
    {
        $plan = $this->planFor($user);
        $title = EntitlementCatalog::title($code);
        $suggested = $this->suggestedPlan($plan);

        if ($suggested !== null) {
            return __('dashboard.:feature is locked on the :plan pack. Upgrade to :next to unlock it.', [
                'feature' => $title,
                'plan' => $plan->title,
                'next' => $suggested->title,
            ]);
        }

        return __('dashboard.:feature is not included in the :plan pack.', [
            'feature' => $title,
            'plan' => $plan->title,
        ]);
    }

    private function quotaMessage(User $user, string $code): string
    {
        $plan = $this->planFor($user);
        $suggested = $this->suggestedPlan($plan);

        if ($code === EntitlementCatalog::LAB_CREDITS) {
            if ($suggested !== null) {
                return __('dashboard.You have used all Lab credits on the :plan pack this month. Upgrade to :next for more room.', [
                    'plan' => $plan->title,
                    'next' => $suggested->title,
                ]);
            }

            return __('dashboard.You have used all Lab credits on the :plan pack this month.', [
                'plan' => $plan->title,
            ]);
        }

        $title = EntitlementCatalog::title($code);

        if ($suggested !== null) {
            return __('dashboard.You have reached the :plan :feature limit. Upgrade to :next for more room.', [
                'feature' => mb_strtolower($title),
                'plan' => $plan->title,
                'next' => $suggested->title,
            ]);
        }

        return __('dashboard.You have reached the :plan :feature limit.', [
            'feature' => mb_strtolower($title),
            'plan' => $plan->title,
        ]);
    }

    public function creditBonus(User $user): int
    {
        if (! Schema::hasTable('credit_grants')) {
            return 0;
        }

        return (int) CreditGrant::query()->where('user_id', $user->id)->sum('amount');
    }

    private function quotaLimit(User $user, string $code, ?PlanGrant $grant): ?int
    {
        if ($grant?->isUnlimited()) {
            return null;
        }

        $base = $grant?->ceiling;
        $bonus = $code === EntitlementCatalog::LAB_CREDITS ? $this->creditBonus($user) : 0;

        if ($base === null && $bonus === 0) {
            return null;
        }

        return (int) ($base ?? 0) + $bonus;
    }

    private function windowFor(User $user, string $code): UsageWindow
    {
        $grant = $this->grant($user, $code);
        if ($grant?->window instanceof UsageWindow) {
            return $grant->window;
        }

        return EntitlementCatalog::definition($code)['window'] ?? UsageWindow::Lifetime;
    }

    private function adjustLedger(User $user, string $code, int $delta): void
    {
        $window = $this->windowFor($user, $code);
        $period = $window->periodKey();

        $row = UsageLedger::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'code' => $code,
                'window_key' => $period,
            ],
            ['consumed' => 0],
        );

        $next = max(0, (int) $row->consumed + $delta);
        $row->forceFill(['consumed' => $next])->save();
    }
}
