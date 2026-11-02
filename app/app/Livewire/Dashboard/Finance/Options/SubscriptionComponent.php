<?php

namespace App\Livewire\Dashboard\Finance\Options;

use App\Finance\SubscriptionDesk;
use App\Livewire\Dashboard\Finance\Traits\HasFinanceChrome;
use App\Models\EntitlementPlan;
use App\Models\UserEntitlement;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class SubscriptionComponent extends Component
{
    use HasFinanceChrome;

    public UserEntitlement $entitlement;

    public string $planPublicId = '';

    public string $confirmAction = '';

    protected function financeSection(): string
    {
        return 'subscriptions';
    }

    public function layoutData(): array
    {
        $label = $this->entitlement->user?->name ?: __('dashboard.Subscription');

        return [
            'title' => $label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Finance'), 'href' => route('dashboard.finance.index')],
                ['label' => __('dashboard.Subscriptions'), 'href' => route('dashboard.finance.subscriptions.index')],
                ['label' => $label, 'current' => true],
            ],
        ];
    }

    public function mount(UserEntitlement $entitlement): void
    {
        $this->authorizeFinance();
        $this->entitlement = $entitlement->load(['user', 'plan', 'invoices']);
        $this->planPublicId = (string) ($entitlement->plan?->public_id ?: '');
    }

    public function savePack(SubscriptionDesk $desk): void
    {
        Gate::authorize('finance.revise');

        $this->validate([
            'planPublicId' => ['required', 'string', 'exists:entitlement_plans,public_id'],
        ]);

        $plan = EntitlementPlan::query()->where('public_id', $this->planPublicId)->firstOrFail();
        $this->entitlement = $desk->changePack($this->entitlement, $plan)->load(['user', 'plan', 'invoices']);
        $this->pulseOk(__('dashboard.Pack updated.'));
    }

    public function askCancel(): void
    {
        Gate::authorize('finance.revise');
        $this->confirmAction = 'cancel';
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'finance-subscription' }))");
    }

    public function askExtend(): void
    {
        Gate::authorize('finance.revise');
        $this->confirmAction = 'extend';
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'finance-subscription' }))");
    }

    public function confirmPending(SubscriptionDesk $desk): void
    {
        Gate::authorize('finance.revise');

        $action = $this->confirmAction;
        $this->reset('confirmAction');
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'finance-subscription' }))");

        if ($action === 'cancel') {
            $desk->cancel($this->entitlement);
            $this->pulseOk(__('dashboard.Subscription canceled.'));
        }

        if ($action === 'extend') {
            $desk->extend($this->entitlement);
            $this->pulseOk(__('dashboard.Period extended.'));
        }

        $this->entitlement = $this->entitlement->fresh(['user', 'plan', 'invoices']);
    }

    public function render(): View
    {
        return view('livewire.dashboard.finance.options.subscription', [
            'section' => $this->financeSection(),
            'nav' => $this->financeNav(),
            'plans' => EntitlementPlan::assignable($this->planPublicId),
        ])->layoutData($this->layoutData());
    }
}
