<?php

namespace App\Livewire\Dashboard\Pages\Options;

use App\Livewire\Dashboard\Pages\Traits\ManagesPageForm;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class CreateComponent extends Component
{
    use ManagesPageForm;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.New page'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Pages'), 'href' => route('dashboard.pages.index')],
                ['label' => __('dashboard.New'), 'current' => true],
            ],
        ];
    }

    public function mount(): void
    {
        Gate::authorize('pages.compose');
    }

    public function save(): void
    {
        Gate::authorize('pages.compose');
        $this->persistPage();
        $this->pulseOk(__('dashboard.Page created.'));
        $this->redirect(route('dashboard.pages.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.pages.options.create')->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
