<?php

namespace App\Livewire\Dashboard\Payments;

use App\Payments\PaymentGatewayStore;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class PaymentsComponent extends Component
{
    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Payment Methods'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Payment Methods'), 'current' => true],
            ],
        ];
    }

    public function mount(): void
    {
        Gate::authorize('payments.revise');
    }

    public function render(PaymentGatewayStore $gateways): View
    {
        return view('livewire.dashboard.payments.payments', [
            'gateways' => $gateways->all(),
        ])->layoutData($this->layoutData());
    }
}
