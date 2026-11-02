<?php

namespace App\Livewire\Dashboard\Languages\Options;

use App\Livewire\Dashboard\Languages\Traits\ManagesLanguageForm;
use App\Models\Language;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class EditComponent extends Component
{
    use ManagesLanguageForm;

    public Language $language;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $label = isset($this->language) ? $this->language->name : __('dashboard.Language');

        return [
            'title' => __('dashboard.Edit').' '.$label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Languages'), 'href' => route('dashboard.languages.index')],
                ['label' => __('dashboard.Edit'), 'current' => true],
            ],
        ];
    }

    public function mount(Language $language): void
    {
        Gate::authorize('languages.revise');
        $this->language = $language;
        $this->fillFromLanguage($language);
    }

    public function save(): void
    {
        Gate::authorize('languages.revise');
        $this->language = $this->persistLanguage($this->language);
        $this->pulseOk(__('dashboard.Language updated.'));
        $this->redirect(route('dashboard.languages.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.languages.options.edit', [
            'lockedDefault' => $this->language->is_default,
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
