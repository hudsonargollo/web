<?php

namespace App\Livewire\Dashboard\Lab\Options;

use App\Lab\LabUsageReport;
use App\Livewire\Dashboard\Lab\Traits\HasLabChrome;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Url;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class UsageComponent extends Component
{
    use HasLabChrome;

    #[Url]
    public string $facet = 'user';

    protected function labSection(): string
    {
        return 'usage';
    }

    public function mount(): void
    {
        $this->authorizeLab();

        if (! in_array($this->facet, ['user', 'project', 'model'], true)) {
            $this->facet = 'user';
        }
    }

    public function showFacet(string $facet): void
    {
        if (! in_array($facet, ['user', 'project', 'model'], true)) {
            return;
        }

        $this->facet = $facet;
    }

    public function render(): View
    {
        return view('livewire.dashboard.lab.options.usage', [
            'byUser' => LabUsageReport::byUser(),
            'byProject' => LabUsageReport::byProject(),
            'byModel' => LabUsageReport::byModel(),
        ])->layoutData($this->layoutData());
    }
}
