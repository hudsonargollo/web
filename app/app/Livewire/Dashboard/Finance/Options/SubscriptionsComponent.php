<?php

namespace App\Livewire\Dashboard\Finance\Options;

use App\Livewire\Dashboard\Finance\Traits\HasFinanceChrome;
use App\Models\UserEntitlement;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class SubscriptionsComponent extends Component
{
    use HasFinanceChrome;
    use WithPagination;

    public string $search = '';

    public string $status = '';

    protected function financeSection(): string
    {
        return 'subscriptions';
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

    public function render(): View
    {
        $query = UserEntitlement::query()
            ->with(['user', 'plan'])
            ->orderByDesc('updated_at');

        if ($this->status !== '') {
            $query->where('status', $this->status);
        }

        $term = trim($this->search);
        if ($term !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('provider_subscription_id', 'like', $like)
                    ->orWhere('status', 'like', $like)
                    ->orWhere('interval', 'like', $like)
                    ->orWhereHas('user', function (Builder $user) use ($like): void {
                        $user->where('name', 'like', $like)
                            ->orWhere('email', 'like', $like)
                            ->orWhere('username', 'like', $like);
                    })
                    ->orWhereHas('plan', function (Builder $plan) use ($like): void {
                        $plan->where('title', 'like', $like)->orWhere('slug', 'like', $like);
                    });
            });
        }

        return view('livewire.dashboard.finance.options.subscriptions', [
            'section' => $this->financeSection(),
            'nav' => $this->financeNav(),
            'rows' => $query->paginate(20),
        ])->layoutData($this->layoutData());
    }
}
