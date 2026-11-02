<?php

namespace App\Livewire\Studio\Traits;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Models\EntitlementPlan;
use App\Models\User;
use App\Support\Site\SiteSettings;
use Cknow\Money\Money;

trait HasStudioChrome
{
    /**
     * @return array{
     *     site: SiteSettings,
     *     user: User|null,
     *     planTitle: string,
     *     packOffer: array{title: string, copy: string, cta: string, href: string}|null,
     *     canExport: bool
     * }
     */
    protected function chromeData(): array
    {
        $user = auth()->user();
        $user?->loadMissing('entitlement.plan', 'accessRole');

        return [
            'site' => app(SiteSettings::class),
            'user' => $user,
            'planTitle' => $user?->entitlement?->plan?->title ?: __('dashboard.Free'),
            'packOffer' => $this->packOffer(),
            'canExport' => $user?->entitled(EntitlementCatalog::ADVANCED_EXPORT) ?? false,
        ];
    }

    /**
     * @return array{title: string, copy: string, cta: string, href: string}|null
     */
    private function packOffer(): ?array
    {
        $catalog = EntitlementPlan::query()
            ->where('is_active', true)
            ->orderBy('rank')
            ->get();

        if ($catalog->isEmpty()) {
            return null;
        }

        $current = auth()->user()?->entitlement?->plan;

        if ($this->packIsOpen($current)) {
            $next = $catalog->first(fn (EntitlementPlan $plan): bool => $plan->slug === 'pro')
                ?? $catalog->first(fn (EntitlementPlan $plan): bool => ! $this->packIsOpen($plan));

            if ($next === null) {
                return null;
            }

            return [
                'title' => __('studio.Upgrade to :pack', ['pack' => $next->title]),
                'copy' => __('studio.Unlock more features'),
                'cta' => __('studio.Upgrade to :pack', ['pack' => $next->title]),
                'href' => app(EntitlementGate::class)->upgradeHref($next),
            ];
        }

        $rank = (int) $current->rank;
        $next = $catalog->first(fn (EntitlementPlan $plan): bool => (int) $plan->rank > $rank);

        if ($next === null) {
            return null;
        }

        return [
            'title' => __('studio.Upgrade to :pack', ['pack' => $next->title]),
            'copy' => filled($next->summary)
                ? $next->summary
                : __('studio.Unlock more features'),
            'cta' => __('studio.Upgrade to :pack', ['pack' => $next->title]),
            'href' => app(EntitlementGate::class)->upgradeHref($next),
        ];
    }

    private function packIsOpen(?EntitlementPlan $plan): bool
    {
        if ($plan === null) {
            return true;
        }

        if ($plan->is_default || $plan->slug === 'free') {
            return true;
        }

        $monthly = $plan->price_monthly;
        $yearly = $plan->price_yearly;

        return ($monthly instanceof Money && $monthly->isZero())
            && ($yearly instanceof Money && $yearly->isZero());
    }
}
