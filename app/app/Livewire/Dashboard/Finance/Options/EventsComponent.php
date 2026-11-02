<?php

namespace App\Livewire\Dashboard\Finance\Options;

use App\Finance\WebhookApplicator;
use App\Livewire\Dashboard\Finance\Traits\HasFinanceChrome;
use App\Models\PaymentWebhookEvent;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class EventsComponent extends Component
{
    use HasFinanceChrome;
    use WithPagination;

    public string $search = '';

    public string $status = '';

    protected function financeSection(): string
    {
        return 'events';
    }

    public function mount(): void
    {
        $this->authorizeFinance();
    }

    public function updatingSearch(): void
    {
        $this->resetPage();
    }

    public function updatingStatus(): void
    {
        $this->resetPage();
    }

    public function retry(string $publicId, WebhookApplicator $applicator): void
    {
        Gate::authorize('finance.revise');

        $event = PaymentWebhookEvent::query()->where('public_id', $publicId)->firstOrFail();
        $applicator->apply($event);
        $this->pulseOk(__('dashboard.Event retried.'));
    }

    public function render(): View
    {
        $query = PaymentWebhookEvent::query()
            ->with(['invoice', 'entitlement.user'])
            ->orderByDesc('id');

        if ($this->status !== '') {
            $query->where('status', $this->status);
        }

        $term = trim($this->search);
        if ($term !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('event_type', 'like', $like)
                    ->orWhere('driver', 'like', $like)
                    ->orWhere('status', 'like', $like)
                    ->orWhere('provider_event_id', 'like', $like);
            });
        }

        return view('livewire.dashboard.finance.options.events', [
            'section' => $this->financeSection(),
            'nav' => $this->financeNav(),
            'rows' => $query->paginate(20),
        ])->layoutData($this->layoutData());
    }
}
