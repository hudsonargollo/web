<?php

namespace App\Livewire\Dashboard\Lab\Options;

use App\Lab\SiteWorkspace;
use App\Livewire\Dashboard\Lab\Traits\HasLabChrome;
use App\Models\LabProject;
use App\Models\User;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'page'])]
class ShowComponent extends Component
{
    use HasLabChrome;

    public LabProject $project;

    public string $ownerPublicId = '';

    public string $confirmAction = '';

    protected function labSection(): string
    {
        return 'projects';
    }

    public function layoutData(): array
    {
        $label = $this->project->title ?: __('dashboard.Untitled');

        return [
            'title' => $label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Lab'), 'href' => route('dashboard.lab.index')],
                ['label' => $label, 'current' => true],
            ],
        ];
    }

    public function mount(LabProject $project): void
    {
        $this->authorizeLab();
        $this->project = $project->load(['user', 'messages']);
        $this->ownerPublicId = (string) ($this->project->user?->public_id ?? '');
    }

    public function saveOwner(): void
    {
        Gate::authorize('projects.revise');

        $owner = User::query()->where('public_id', $this->ownerPublicId)->firstOrFail();
        $this->project->update(['user_id' => $owner->id]);
        $this->project = $this->project->fresh(['user', 'messages']);
        $this->pulseOk(__('dashboard.Owner updated.'));
    }

    public function askFreeze(): void
    {
        Gate::authorize('projects.revise');

        if ($this->project->isFrozen()) {
            $this->project->unfreeze();
            $this->project = $this->project->fresh(['user', 'messages']);
            $this->pulseOk(__('dashboard.Project unfrozen.'));

            return;
        }

        $this->queueConfirm('freeze');
    }

    public function askDelete(): void
    {
        Gate::authorize('projects.retire');
        $this->queueConfirm('delete');
    }

    public function confirmPending(SiteWorkspace $workspaces): void
    {
        $action = $this->confirmAction;
        $this->reset('confirmAction');
        $this->closeConfirm();

        if ($action === 'freeze') {
            Gate::authorize('projects.revise');
            $this->project->freeze();
            $this->project = $this->project->fresh(['user', 'messages']);
            $this->pulseOk(__('dashboard.Project frozen.'));

            return;
        }

        if ($action === 'delete') {
            Gate::authorize('projects.retire');
            $workspaces->forget($this->project);
            $this->project->messages()->delete();
            $this->project->delete();
            Pulse::ok(__('dashboard.Project deleted.'));
            $this->redirect(route('dashboard.lab.index'), navigate: true);
        }
    }

    public function render(): View
    {
        return view('livewire.dashboard.lab.options.show', [
            'owners' => User::query()->orderBy('name')->get(['id', 'public_id', 'name', 'email']),
        ])->layoutData($this->layoutData());
    }

    private function queueConfirm(string $action): void
    {
        $this->confirmAction = $action;
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'lab-project-confirm' }))");
    }

    private function closeConfirm(): void
    {
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'lab-project-confirm' }))");
    }
}
