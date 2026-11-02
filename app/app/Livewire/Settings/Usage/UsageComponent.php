<?php

namespace App\Livewire\Settings\Usage;

use App\Entitlement\EntitlementGate;
use App\Lab\LabUsageReport;
use App\Livewire\Settings\Traits\HasAccountChrome;
use App\Support\Seo\PageSeo;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class UsageComponent extends Component
{
    use HasAccountChrome;

    protected function deskSection(): string
    {
        return 'usage';
    }

    public function mount(PageSeo $seo): void
    {
        $this->authorizeDesk();
        $this->hydrateDeskSeo($seo);
    }

    public function render(EntitlementGate $gate): View
    {
        $user = auth()->user();

        return view('livewire.settings.usage.usage', [
            'section' => $this->deskSection(),
            'snapshot' => $gate->snapshot($user),
            'ledger' => LabUsageReport::forAccount($user),
        ]);
    }
}
