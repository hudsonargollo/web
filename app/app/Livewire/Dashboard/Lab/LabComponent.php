<?php

namespace App\Livewire\Dashboard\Lab;

use App\Livewire\Dashboard\Lab\Traits\HasLabChrome;
use App\Models\LabProject;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class LabComponent extends Component
{
    use HasLabChrome;

    public string $search = '';

    protected function labSection(): string
    {
        return 'projects';
    }

    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Lab'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Lab'), 'current' => true],
            ],
        ];
    }

    public function mount(): void
    {
        $this->authorizeLab();
    }

    public function render(): View
    {
        return view('livewire.dashboard.lab.lab', [
            'projects' => $this->projectsQuery()->get(),
        ])->layoutData($this->layoutData());
    }

    /**
     * @return Builder<LabProject>
     */
    protected function projectsQuery(): Builder
    {
        $query = LabProject::query()
            ->with('user')
            ->withCount('messages')
            ->orderByDesc('updated_at');

        $term = trim($this->search);

        if ($term === '') {
            return $query;
        }

        $like = '%'.$this->escapeLike($term).'%';

        return $query->where(function (Builder $builder) use ($like): void {
            $builder
                ->where('title', 'like', $like)
                ->orWhere('notes', 'like', $like)
                ->orWhere('stack', 'like', $like)
                ->orWhereHas(
                    'user',
                    fn (Builder $user): Builder => $user
                        ->where('name', 'like', $like)
                        ->orWhere('username', 'like', $like)
                        ->orWhere('email', 'like', $like),
                );
        });
    }

    protected function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
