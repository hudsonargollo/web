<?php

namespace App\Livewire\Dashboard\Invoices;

use App\Models\Invoice;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class InvoicesComponent extends Component
{
    use WithPagination;

    public string $search = '';

    public string $status = '';

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Invoices'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Invoices'), 'current' => true],
            ],
        ];
    }

    public function mount(): void
    {
        Gate::authorize('finance.browse');
    }

    public function updatingSearch(): void
    {
        $this->resetPage();
    }

    public function updatingStatus(): void
    {
        $this->resetPage();
    }

    public function render(): View
    {
        $query = Invoice::query()
            ->with(['user', 'plan'])
            ->orderByDesc('id');

        if ($this->status !== '') {
            $query->where('status', $this->status);
        }

        $term = trim($this->search);
        if ($term !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('driver', 'like', $like)
                    ->orWhere('currency', 'like', $like)
                    ->orWhere('provider_invoice_id', 'like', $like)
                    ->orWhere('status', 'like', $like)
                    ->orWhereHas('user', function (Builder $user) use ($like): void {
                        $user->where('name', 'like', $like)
                            ->orWhere('email', 'like', $like);
                    })
                    ->orWhereHas('plan', function (Builder $plan) use ($like): void {
                        $plan->where('title', 'like', $like);
                    });
            });
        }

        return view('livewire.dashboard.invoices.invoices', [
            'rows' => $query->paginate(20),
        ])->layoutData($this->layoutData());
    }
}
