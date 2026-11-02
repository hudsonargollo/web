<?php

namespace App\Livewire\Dashboard\Contacts;

use App\Models\Contact;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class ContactsComponent extends Component
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
            'title' => __('dashboard.Contacts'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Contacts'), 'current' => true],
            ],
        ];
    }

    public function mount(): void
    {
        Gate::authorize('contacts.browse');
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
        $query = Contact::query()
            ->with('plan')
            ->orderByDesc('id');

        $term = trim($this->search);
        if ($term !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('body', 'like', $like);
            });
        }

        if ($this->status === 'unread') {
            $query->whereNull('read_at')->whereNull('replied_at');
        } elseif ($this->status === 'open') {
            $query->whereNull('replied_at');
        } elseif ($this->status === 'replied') {
            $query->whereNotNull('replied_at');
        }

        return view('livewire.dashboard.contacts.contacts', [
            'rows' => $query->paginate(24),
        ]);
    }
}
