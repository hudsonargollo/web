<?php

namespace App\Livewire\Dashboard\Finance;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Finance\FinanceLedgerExport;
use App\Finance\FinanceSnapshot;
use App\Livewire\Dashboard\Finance\Traits\HasFinanceChrome;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Auth;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Symfony\Component\HttpFoundation\StreamedResponse;

#[Layout('components.layouts.dashboard', ['skeleton' => 'page'])]
class FinanceComponent extends Component
{
    use HasFinanceChrome;

    protected function financeSection(): string
    {
        return 'overview';
    }

    public function mount(): void
    {
        $this->authorizeFinance();
    }

    public function export(string $format, FinanceLedgerExport $exporter, EntitlementGate $entitlements): StreamedResponse
    {
        $this->authorizeFinance();

        abort_unless(in_array($format, ['csv', 'tsv', 'json'], true), 404);

        if (in_array($format, ['tsv', 'json'], true)) {
            $user = Auth::user();
            abort_unless($user !== null, 403);
            $entitlements->assertFeature($user, EntitlementCatalog::ADVANCED_EXPORT);
        }

        return $exporter->download(null, $format);
    }

    public function render(FinanceSnapshot $snapshot): View
    {
        return view('livewire.dashboard.finance.finance', [
            'section' => $this->financeSection(),
            'nav' => $this->financeNav(),
            'cards' => $snapshot->cards(),
            'invoices' => $snapshot->recentInvoices(),
            'grants' => $snapshot->recentGrants(),
            'events' => $snapshot->recentEvents(),
            'canAdvancedExport' => Auth::user()?->entitled(EntitlementCatalog::ADVANCED_EXPORT) ?? false,
        ])->layoutData($this->layoutData());
    }
}
