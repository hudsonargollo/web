<?php

namespace App\Livewire\Dashboard\Credits;

use App\Entitlement\EntitlementCatalog;
use App\Finance\CreditIssuer;
use App\Finance\CreditKind;
use App\Models\CreditGrant;
use App\Models\EntitlementPlan;
use App\Models\User;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class CreditsComponent extends Component
{
    use WithPagination;

    public string $search = '';

    public string $userPublicId = '';

    public string $kind = 'grant';

    public string $amount = '';

    public string $planPublicId = '';

    public string $reason = '';

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Credits'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Credits'), 'current' => true],
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

    public function grant(CreditIssuer $issuer): void
    {
        Gate::authorize('finance.revise');

        $validated = $this->validate([
            'userPublicId' => ['required', 'string', 'exists:users,public_id'],
            'kind' => ['required', Rule::in(['grant', 'adjustment', 'topup'])],
            'amount' => [Rule::requiredIf($this->kind !== 'topup'), 'nullable', 'integer', 'not_in:0'],
            'planPublicId' => [Rule::requiredIf($this->kind === 'topup'), 'nullable', 'string', 'exists:entitlement_plans,public_id'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::query()->where('public_id', $validated['userPublicId'])->firstOrFail();
        $actor = Auth::user();
        $plan = filled($validated['planPublicId'] ?? null)
            ? EntitlementPlan::query()->where('public_id', $validated['planPublicId'])->first()
            : null;

        if ($validated['kind'] === 'topup') {
            abort_unless($plan !== null, 422);
            $issuer->topUp($user, $plan, $validated['reason'] ?? null, $actor);
        } else {
            $issuer->issue(
                $user,
                (int) $validated['amount'],
                CreditKind::from($validated['kind']),
                $validated['reason'] ?? null,
                $actor,
                $plan,
            );
        }

        $this->reset('amount', 'reason');
        $packet = Pulse::craft(__('dashboard.Credits granted.'), __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }

    public function render(): View
    {
        $query = CreditGrant::query()
            ->with(['user', 'actor', 'plan'])
            ->orderByDesc('id');

        $term = trim($this->search);
        if ($term !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('kind', 'like', $like)
                    ->orWhere('reason', 'like', $like)
                    ->orWhereHas('user', function (Builder $user) use ($like): void {
                        $user->where('name', 'like', $like)->orWhere('email', 'like', $like);
                    })
                    ->orWhereHas('actor', function (Builder $actor) use ($like): void {
                        $actor->where('name', 'like', $like);
                    });
            });
        }

        $topupPlans = EntitlementPlan::query()
            ->with('grants')
            ->orderBy('rank')
            ->get()
            ->filter(function (EntitlementPlan $plan): bool {
                $grant = $plan->grantFor(EntitlementCatalog::LAB_CREDITS);

                return $grant !== null && ! $grant->isUnlimited() && (int) $grant->ceiling > 0;
            })
            ->values();

        return view('livewire.dashboard.credits.credits', [
            'rows' => $query->paginate(20),
            'people' => User::query()->orderBy('name')->get(['id', 'public_id', 'name', 'email']),
            'plans' => $topupPlans,
        ])->layoutData($this->layoutData());
    }
}
