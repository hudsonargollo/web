<?php

namespace App\Livewire\Dashboard\Newsletter;

use App\Models\NewsletterSubscriber;
use App\Support\Newsletter\NewsletterListExport;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithPagination;
use Symfony\Component\HttpFoundation\StreamedResponse;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class NewsletterComponent extends Component
{
    use WithPagination;

    public string $search = '';

    public string $confirmPublicId = '';

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Newsletter'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Newsletter'), 'current' => true],
            ],
        ];
    }

    public function mount(): void
    {
        Gate::authorize('settings.revise');
    }

    public function updatingSearch(): void
    {
        $this->resetPage();
    }

    public function askRemove(string $publicId): void
    {
        Gate::authorize('settings.revise');
        $this->confirmPublicId = $publicId;
        $this->dispatch('krikkit-modal-open', 'remove-subscriber');
    }

    public function export(string $format, NewsletterListExport $exporter): StreamedResponse
    {
        Gate::authorize('settings.revise');

        abort_unless(in_array($format, ['csv', 'tsv', 'json'], true), 404);

        return $exporter->download($this->subscribersQuery()->get(), $format);
    }

    public function confirmPending(): void
    {
        Gate::authorize('settings.revise');
        $id = $this->confirmPublicId;
        $this->reset('confirmPublicId');
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'remove-subscriber' }))");

        if ($id === '') {
            return;
        }

        NewsletterSubscriber::query()->where('public_id', $id)->delete();
        Pulse::ok(__('dashboard.Subscriber removed.'));
    }

    public function render(): View
    {
        return view('livewire.dashboard.newsletter.newsletter', [
            'rows' => $this->subscribersQuery()->paginate(24),
            'hasSubscribers' => NewsletterSubscriber::query()->exists(),
        ]);
    }

    /**
     * @return Builder<NewsletterSubscriber>
     */
    protected function subscribersQuery(): Builder
    {
        $query = NewsletterSubscriber::query()->orderByDesc('id');
        $term = trim($this->search);
        if ($term !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';
            $query->where('email', 'like', $like);
        }

        return $query;
    }
}
