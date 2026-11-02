<?php

namespace App\Livewire\Dashboard\Lab\Options;

use App\Lab\LabTurnHealth;
use App\Livewire\Dashboard\Lab\Traits\HasLabChrome;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class TurnsComponent extends Component
{
    use HasLabChrome;

    protected function labSection(): string
    {
        return 'turns';
    }

    public function mount(): void
    {
        $this->authorizeLab();
    }

    public function render(): View
    {
        $turns = LabTurnHealth::scan();

        return view('livewire.dashboard.lab.options.turns', [
            'failed' => $turns['failed'],
            'stuck' => $turns['stuck'],
        ])->layoutData($this->layoutData());
    }
}
