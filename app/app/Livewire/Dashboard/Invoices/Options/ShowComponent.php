<?php

namespace App\Livewire\Dashboard\Invoices\Options;

use App\Finance\InvoiceRefundDesk;
use App\Models\Invoice;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;
use RuntimeException;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class ShowComponent extends Component
{
    public Invoice $invoice;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $label = $this->invoice->formattedAmount();

        return [
            'title' => $label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Invoices'), 'href' => route('dashboard.invoices.index')],
                ['label' => $label, 'current' => true],
            ],
        ];
    }

    public function mount(Invoice $invoice): void
    {
        Gate::authorize('finance.browse');
        $this->invoice = $invoice->load(['user', 'plan', 'entitlement', 'refundedBy', 'events']);
    }

    public function askRefund(): void
    {
        Gate::authorize('finance.revise');
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'refund-invoice' }))");
    }

    public function confirmPending(InvoiceRefundDesk $desk): void
    {
        Gate::authorize('finance.revise');
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'refund-invoice' }))");

        if (! $this->invoice->canRefund()) {
            $this->pulseFail(__('dashboard.This invoice cannot be refunded.'));

            return;
        }

        try {
            $this->invoice = $desk->refund($this->invoice, Auth::user());
        } catch (RuntimeException $e) {
            $this->pulseFail($e->getMessage());

            return;
        }

        $this->pulseOk(__('dashboard.Invoice refunded.'));
    }

    public function render(): View
    {
        return view('livewire.dashboard.invoices.options.show')
            ->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');

        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }

    private function pulseFail(string $copy): void
    {
        $packet = Pulse::craft($copy, null, 'fail');

        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
