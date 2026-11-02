<?php

namespace App\Livewire\Dashboard\Packs\Options;

use App\Livewire\Dashboard\Packs\Traits\ManagesPackForm;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class CreateComponent extends Component
{
    use ManagesPackForm;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.New pack'),
            'breadcrumbs' => [
                ['label' => __('dashboard.Packs'), 'href' => route('dashboard.packs.index')],
                ['label' => __('dashboard.New'), 'current' => true],
            ],
        ];
    }

    public function mount(): void
    {
        Gate::authorize('packs.compose');
        $this->seedGrantDefaults();
    }

    public function save(): void
    {
        Gate::authorize('packs.compose');

        $this->persistPack();
        $this->pulseOk(__('dashboard.Pack created.'));
        $this->redirect(route('dashboard.packs.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.packs.options.create', [
            'catalog' => $this->catalog(),
            'builtIn' => false,
            'creditExamples' => $this->creditExamples(),
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
