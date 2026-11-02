<?php

namespace App\Livewire\Dashboard\Users\Options;

use App\Enums\UserStatus;
use App\Livewire\Dashboard\Users\Traits\ManagesUserForm;
use App\Models\AccessRole;
use App\Models\EntitlementPlan;
use App\Models\User;
use App\Support\Geography\Countries;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Lazy;
use Livewire\Component;
use Livewire\WithFileUploads;

#[Lazy]
#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class EditComponent extends Component
{
    use ManagesUserForm;
    use WithFileUploads;

    public User $user;

    public function placeholder(): View
    {
        return view('components.dashboard.livewirePlaceholder', ['variant' => 'form'])
            ->layoutData($this->layoutData());
    }

    public function layoutData(): array
    {
        $label = isset($this->user)
            ? ($this->user->username ?: $this->user->name)
            : __('dashboard.User');

        return [
            'title' => __('dashboard.Edit').' '.$label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Users'), 'href' => route('dashboard.users.index')],
                ['label' => __('dashboard.Edit'), 'current' => true],
            ],
        ];
    }

    public function mount(User $user): void
    {
        Gate::authorize('users.revise');

        $this->user = $user->loadMissing('entitlement.plan');
        $this->fillFromUser($this->user);
    }

    public function save(): void
    {
        Gate::authorize('users.revise');

        $payload = $this->validatedUserPayload($this->user);
        $this->guardSoleOwnerDemotion($this->user, (int) $payload['access_role_id']);

        $this->user->update($payload);
        $this->persistPlan($this->user);

        $this->fillFromUser($this->user->fresh()->loadMissing('entitlement.plan'));
        $this->pulseOk(__('dashboard.User updated.'));
        $this->redirect(route('dashboard.users.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.users.options.edit', [
            'roles' => AccessRole::query()->orderBy('title')->get(),
            'plans' => EntitlementPlan::assignable($this->planPublicId),
            'countries' => Countries::options(),
            'statuses' => UserStatus::cases(),
        ])->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
