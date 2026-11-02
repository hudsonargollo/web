<?php

namespace App\Livewire\Dashboard\Settings\Options;

use App\Livewire\Dashboard\Settings\Traits\HasSettingsChrome;
use App\Livewire\Dashboard\Settings\Traits\ManagesLegalDocument;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class PrivacyComponent extends Component
{
    use HasSettingsChrome;
    use ManagesLegalDocument;

    public function render(): View
    {
        return view('livewire.dashboard.settings.options.privacy', [
            'section' => $this->settingsSection(),
            'nav' => $this->settingsNav(),
        ])->layoutData($this->layoutData());
    }

    protected function settingsSection(): string
    {
        return 'privacy';
    }

    protected function legalGroup(): string
    {
        return 'privacy';
    }
}
