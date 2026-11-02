<?php

namespace App\Livewire\Dashboard\Pages\Options;

use App\Livewire\Dashboard\Pages\Traits\ManagesPageForm;
use App\Models\SitePage;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class EditComponent extends Component
{
    use ManagesPageForm;

    public SitePage $page;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $label = isset($this->page) ? $this->page->title : __('dashboard.Page');

        return [
            'title' => __('dashboard.Edit').' '.$label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Pages'), 'href' => route('dashboard.pages.index')],
                ['label' => __('dashboard.Edit'), 'current' => true],
            ],
        ];
    }

    public function mount(SitePage $page): void
    {
        Gate::authorize('pages.revise');
        $this->page = $page;
        $this->fillFromPage($page);
    }

    public function save(): void
    {
        Gate::authorize('pages.revise');
        $this->page = $this->persistPage($this->page);
        $this->pulseOk(__('dashboard.Page updated.'));
        $this->redirect(route('dashboard.pages.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.pages.options.edit', [
            'publicUrl' => $this->page->isReleased() ? route('pages.leaf', $this->page->slug) : null,
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
