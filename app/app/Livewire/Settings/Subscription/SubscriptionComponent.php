<?php

namespace App\Livewire\Settings\Subscription;

use App\Entitlement\EntitlementGate;
use App\Livewire\Settings\Traits\HasAccountChrome;
use App\Support\Seo\PageSeo;
use App\Support\Site\HomePacks;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class SubscriptionComponent extends Component
{
    use HasAccountChrome;

    protected function deskSection(): string
    {
        return 'subscription';
    }

    public function mount(PageSeo $seo): void
    {
        $this->authorizeDesk();
        $this->hydrateDeskSeo($seo);
    }

    public function render(EntitlementGate $gate): View
    {
        $user = auth()->user();
        $user->loadMissing('entitlement.plan');

        return view('livewire.settings.subscription.subscription', [
            'section' => $this->deskSection(),
            'snapshot' => $gate->snapshot($user),
            'entitlement' => $user->entitlement,
            'currentPlan' => $gate->planFor($user),
            'offers' => HomePacks::upgradeOffers($user),
        ]);
    }
}
