<?php

namespace App\Livewire\Studio\Traits;

use App\Entitlement\Exceptions\EntitlementDeniedException;
use App\Lab\StudioProjectDesk;
use App\Models\LabProject;
use App\Models\User;
use App\Support\Ui\Pulse;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Locked;

trait ManagesStudioProjects
{
    public string $renameTitle = '';

    #[Locked]
    public string $pendingProject = '';

    public function toggleStar(string $uuid): void
    {
        $this->desk()->toggleStar($this->studioUser(), $uuid);
    }

    public function askRename(string $uuid): void
    {
        $project = $this->desk()->owned($this->studioUser(), $uuid);
        $this->pendingProject = $project->uuid;
        $this->renameTitle = (string) ($project->title ?: '');
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'rename-project' }))");
    }

    public function saveRename(): void
    {
        $title = trim($this->renameTitle);

        if ($title === '') {
            throw ValidationException::withMessages([
                'renameTitle' => __('studio.Give the project a name.'),
            ]);
        }

        if (mb_strlen($title) > 120) {
            throw ValidationException::withMessages([
                'renameTitle' => __('studio.Keep the name under 120 characters.'),
            ]);
        }

        $this->desk()->rename($this->studioUser(), $this->pendingProject, $title);
        $this->pendingProject = '';
        $this->renameTitle = '';
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'rename-project' }))");
        $this->pulseStudio(__('studio.Project renamed.'));
    }

    public function duplicateProject(string $uuid): void
    {
        try {
            $this->desk()->duplicate($this->studioUser(), $uuid);
        } catch (EntitlementDeniedException $denied) {
            $this->pulseStudio($denied->getMessage(), 'fail');

            return;
        }

        $this->pulseStudio(__('studio.Project duplicated.'));
    }

    public function askDelete(string $uuid): void
    {
        $project = $this->desk()->owned($this->studioUser(), $uuid);
        $this->pendingProject = $project->uuid;
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'delete-project' }))");
    }

    public function confirmDelete(): void
    {
        $uuid = $this->pendingProject;
        $this->pendingProject = '';
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'delete-project' }))");

        if ($uuid === '') {
            return;
        }

        $this->desk()->delete($this->studioUser(), $uuid);
        $this->pulseStudio(__('studio.Project deleted.'));
    }

    /**
     * @return Collection<int, LabProject>
     */
    protected function projectShelf(string $column, int $limit, bool $starred = false, string $term = ''): Collection
    {
        $user = auth()->user();

        if ($user === null) {
            return collect();
        }

        $query = $user->labProjects()->orderByDesc($column)->limit($limit);

        if ($column === 'opened_at') {
            $query->whereNotNull('opened_at');
        }

        if ($starred) {
            $query->whereNotNull('starred_at')->orderByDesc('starred_at');
        }

        $needle = trim($term);

        if ($needle !== '') {
            $like = '%'.addcslashes($needle, '%_\\').'%';
            $query->where(function ($builder) use ($like): void {
                $builder
                    ->where('title', 'like', $like)
                    ->orWhere('notes', 'like', $like)
                    ->orWhere('stack', 'like', $like);
            });
        }

        return $query->get();
    }

    protected function studioUser(): User
    {
        $user = auth()->user();
        abort_unless($user !== null, 403);

        return $user;
    }

    private function desk(): StudioProjectDesk
    {
        return app(StudioProjectDesk::class);
    }

    private function pulseStudio(string $copy, string $tone = 'ok'): void
    {
        $packet = Pulse::craft($copy, $tone === 'ok' ? __('dashboard.Saved') : null, $tone);

        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
