<?php

namespace App\Livewire\Settings\Credits;

use App\Entitlement\EntitlementGate;
use App\Livewire\Settings\Traits\HasAccountChrome;
use App\Models\CreditGrant;
use App\Support\Seo\PageSeo;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class CreditsComponent extends Component
{
    use HasAccountChrome;

    protected function deskSection(): string
    {
        return 'credits';
    }

    public function mount(PageSeo $seo): void
    {
        $this->authorizeDesk();
        $this->hydrateDeskSeo($seo);
    }

    public function render(EntitlementGate $gate): View
    {
        $user = auth()->user();

        return view('livewire.settings.credits.credits', [
            'section' => $this->deskSection(),
            'credits' => $gate->creditSnapshot($user),
            'grants' => CreditGrant::query()
                ->where('user_id', $user->id)
                ->with('plan')
                ->latest()
                ->limit(40)
                ->get(),
        ]);
    }
}
