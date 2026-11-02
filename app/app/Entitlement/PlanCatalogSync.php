<?php

namespace App\Entitlement;

use App\Models\EntitlementPlan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class PlanCatalogSync
{
    public function sync(): void
    {
        if (! Schema::hasTable('entitlement_plans') || ! Schema::hasTable('plan_grants')) {
            return;
        }

        DB::transaction(function (): void {
            $kept = [];

            foreach (PlanBlueprint::packs() as $pack) {
                $plan = EntitlementPlan::query()->firstOrNew(['slug' => $pack['slug']]);
                $creating = ! $plan->exists;
                if (blank($plan->public_id)) {
                    $plan->public_id = (string) Str::ulid();
                }
                $payload = [
                    'title' => $pack['title'],
                    'summary' => $pack['summary'],
                    'rank' => $pack['rank'],
                    'is_default' => $pack['is_default'],
                    'is_active' => true,
                ];
                $stampPrice = $creating;
                if (! $creating && array_key_exists('price_monthly', $pack)) {
                    $current = $plan->price_monthly;
                    $stampPrice = $current === null || $current->isZero() || $current->isNegative();
                }
                if ($stampPrice) {
                    $payload['price_monthly'] = $pack['price_monthly'] ?? null;
                    $payload['price_yearly'] = $pack['price_yearly'] ?? null;
                }
                $plan->fill($payload)->save();

                $kept[] = $plan->slug;
                $grantCodes = [];

                foreach ($pack['grants'] as $code => $grant) {
                    $definition = EntitlementCatalog::definition($code);
                    if ($definition === null) {
                        continue;
                    }

                    $window = $grant['window'] ?? $definition['window'];

                    $plan->grants()->updateOrCreate(
                        ['code' => $code],
                        [
                            'kind' => $definition['kind']->value,
                            'allowed' => $grant['allowed'] ?? true,
                            'ceiling' => array_key_exists('ceiling', $grant) ? $grant['ceiling'] : null,
                            'window' => $window instanceof UsageWindow ? $window->value : (string) $window,
                        ]
                    );

                    $grantCodes[] = $code;
                }

                $plan->grants()->whereNotIn('code', $grantCodes)->delete();
            }

            EntitlementPlan::query()
                ->whereNotIn('slug', $kept)
                ->where('is_default', false)
                ->whereDoesntHave('entitlements')
                ->delete();
        });
    }

    /**
     * Add catalog codes that a pack does not have yet. Never overwrites existing grants.
     */
    public function ensureMissingGrants(): void
    {
        if (! Schema::hasTable('entitlement_plans') || ! Schema::hasTable('plan_grants')) {
            return;
        }

        $blueprint = [];
        foreach (PlanBlueprint::packs() as $pack) {
            $blueprint[$pack['slug']] = $pack['grants'];
        }

        foreach (EntitlementPlan::query()->with('grants')->get() as $plan) {
            $existing = $plan->grants->pluck('code')->all();

            foreach (EntitlementCatalog::definitions() as $definition) {
                $code = $definition['code'];
                if (in_array($code, $existing, true)) {
                    continue;
                }

                $fromBlueprint = $blueprint[$plan->slug][$code] ?? [];
                $window = $fromBlueprint['window'] ?? $definition['window'];

                $plan->grants()->create([
                    'code' => $code,
                    'kind' => $definition['kind']->value,
                    'allowed' => (bool) ($fromBlueprint['allowed'] ?? $definition['kind'] !== GrantKind::Feature),
                    'ceiling' => array_key_exists('ceiling', $fromBlueprint) ? $fromBlueprint['ceiling'] : null,
                    'window' => $window instanceof UsageWindow ? $window->value : (string) $window,
                ]);
            }
        }
    }
}
