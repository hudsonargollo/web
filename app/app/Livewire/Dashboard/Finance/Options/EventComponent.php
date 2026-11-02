<?php

namespace App\Livewire\Dashboard\Finance\Options;

use App\Finance\WebhookApplicator;
use App\Livewire\Dashboard\Finance\Traits\HasFinanceChrome;
use App\Models\PaymentWebhookEvent;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class EventComponent extends Component
{
    use HasFinanceChrome;

    public PaymentWebhookEvent $event;

    protected function financeSection(): string
    {
        return 'events';
    }

    public function layoutData(): array
    {
        $label = $this->event->event_type;

        return [
            'title' => $label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Finance'), 'href' => route('dashboard.finance.index')],
                ['label' => __('dashboard.Events'), 'href' => route('dashboard.finance.events.index')],
                ['label' => $label, 'current' => true],
            ],
        ];
    }

    public function mount(PaymentWebhookEvent $event): void
    {
        $this->authorizeFinance();
        $this->event = $event->load(['invoice.user', 'entitlement.user']);
    }

    public function retry(WebhookApplicator $applicator): void
    {
        Gate::authorize('finance.revise');
        $this->event = $applicator->apply($this->event)->load(['invoice.user', 'entitlement.user']);
        $this->pulseOk(__('dashboard.Event retried.'));
    }

    public function render(): View
    {
        return view('livewire.dashboard.finance.options.event', [
            'section' => $this->financeSection(),
            'nav' => $this->financeNav(),
            'payload' => json_encode($this->event->payload ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        ])->layoutData($this->layoutData());
    }
}
