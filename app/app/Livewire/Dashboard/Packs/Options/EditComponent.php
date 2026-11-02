<?php

namespace App\Livewire\Dashboard\Packs\Options;

use App\Livewire\Dashboard\Packs\Traits\ManagesPackForm;
use App\Models\EntitlementPlan;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class EditComponent extends Component
{
    use ManagesPackForm;

    public EntitlementPlan $plan;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $label = isset($this->plan)
            ? $this->plan->title
            : __('dashboard.Pack');

        return [
            'title' => __('dashboard.Edit').' '.$label,
            'breadcrumbs' => [
                ['label' => __('dashboard.Packs'), 'href' => route('dashboard.packs.index')],
                ['label' => __('dashboard.Edit'), 'current' => true],
            ],
        ];
    }

    public function mount(EntitlementPlan $plan): void
    {
        Gate::authorize('packs.revise');

        $this->plan = $plan->loadMissing('grants');
        $this->fillFromPlan($this->plan);
    }

    public function save(): void
    {
        Gate::authorize('packs.revise');

        $this->plan = $this->persistPack($this->plan);
        $this->pulseOk(__('dashboard.Pack updated.'));
        $this->redirect(route('dashboard.packs.index'), navigate: true);
    }

    public function render(): View
    {
        return view('livewire.dashboard.packs.options.edit', [
            'catalog' => $this->catalog(),
            'builtIn' => $this->plan->isBuiltIn(),
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
