<?php

namespace App\Livewire\Dashboard\Languages\Options;

use App\Livewire\Dashboard\Languages\Traits\ManagesLanguageForm;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class CreateComponent extends Component
{
    use ManagesLanguageForm;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.New language'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Languages'), 'href' => route('dashboard.languages.index')],
                ['label' => __('dashboard.New'), 'current' => true],
            ],
        ];
    }

    public function mount(): void
    {
        Gate::authorize('languages.compose');
    }

    public function save(): void
    {
        Gate::authorize('languages.compose');
        $this->persistLanguage();
        $this->pulseOk(__('dashboard.Language created.'));
        $this->redirect(route('dashboard.languages.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.languages.options.create')->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
