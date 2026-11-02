<?php

namespace App\Livewire\Dashboard\Settings\Options;

use App\Livewire\Dashboard\Settings\Traits\HasSettingsChrome;
use App\Livewire\Dashboard\Settings\Traits\ManagesLegalDocument;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class TermsComponent extends Component
{
    use HasSettingsChrome;
    use ManagesLegalDocument;

    public function render(): View
    {
        return view('livewire.dashboard.settings.options.terms', [
            'section' => $this->settingsSection(),
            'nav' => $this->settingsNav(),
        ])->layoutData($this->layoutData());
    }

    protected function settingsSection(): string
    {
        return 'terms';
    }

    protected function legalGroup(): string
    {
        return 'terms';
    }
}
