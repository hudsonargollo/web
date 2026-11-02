<?php

namespace App\Livewire\Dashboard\Settings\Options;

use App\Lab\Publish\LabPublishConfig;
use App\Livewire\Dashboard\Settings\Traits\HasSettingsChrome;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class PublishComponent extends Component
{
    use HasSettingsChrome;

    public bool $enabled = true;

    public function mount(SiteSettings $site): void
    {
        $this->authorizeSettings();
        $this->enabled = $site->publishEnabled();
    }

    public function save(SiteSettings $site): void
    {
        $this->authorizeSettings();

        $validated = $this->validate([
            'enabled' => ['boolean'],
        ]);

        $site->put('publish', [
            'enabled' => (bool) $validated['enabled'],
        ]);

        $this->enabled = $site->publishEnabled();
        $this->pulseOk(__('dashboard.Settings saved.'));
    }

    public function render(LabPublishConfig $publish): View
    {
        $parent = $publish->parentDomain();

        return view('livewire.dashboard.settings.options.publish', [
            'section' => $this->settingsSection(),
            'nav' => $this->settingsNav(),
            'parent' => $parent,
            'appUrl' => rtrim((string) config('app.url'), '/'),
            'serverIp' => $publish->serverIp(),
        ])->layoutData($this->layoutData());
    }

    protected function settingsSection(): string
    {
        return 'publish';
    }
}
