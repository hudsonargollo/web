<?php

namespace App\Livewire\Dashboard\Settings\Options;

use App\Lab\LabConsoleCopy;
use App\Livewire\Dashboard\Settings\Traits\HasSettingsChrome;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class LabComponent extends Component
{
    use HasSettingsChrome;

    public string $runtimeName = LabConsoleCopy::DEFAULT_NAME;

    public string $waiting = '';

    public string $noPackage = '';

    public string $installing = '';

    public string $ready = '';

    public string $cacheHit = '';

    public string $noScript = '';

    public string $autoStart = '';

    public string $exited = '';

    public string $failed = '';

    public string $shellUnavailable = '';

    public function mount(SiteSettings $site): void
    {
        $this->authorizeSettings();
        $this->hydrateLab($site);
    }

    public function save(SiteSettings $site): void
    {
        $this->authorizeSettings();

        $rules = [
            'runtimeName' => ['required', 'string', 'max:40'],
        ];

        foreach (array_keys($this->lineMap()) as $property) {
            $rules[$property] = ['nullable', 'string', 'max:200'];
        }

        $validated = $this->validate($rules);
        $name = LabConsoleCopy::clean((string) $validated['runtimeName'], 40);

        if ($name === '') {
            $this->addError('runtimeName', __('validation.required'));

            return;
        }

        $payload = [
            'runtime_name' => $name,
        ];

        foreach ($this->lineMap() as $property => $key) {
            $payload[$key] = LabConsoleCopy::clean((string) ($validated[$property] ?? ''), 200);
        }

        $site->put('lab', $payload);
        $this->hydrateLab($site);
        $this->pulseOk(__('dashboard.Settings saved.'));
    }

    public function render(): View
    {
        $defaults = LabConsoleCopy::defaults();

        return view('livewire.dashboard.settings.options.lab', [
            'section' => $this->settingsSection(),
            'nav' => $this->settingsNav(),
            'statusFields' => [
                ['waiting', __('dashboard.Waiting for package.json'), $defaults['waiting']],
                ['noPackage', __('dashboard.No package.json'), $defaults['no_package']],
                ['installing', __('dashboard.Installing dependencies'), $defaults['installing']],
                ['ready', __('dashboard.Dependencies ready'), $defaults['ready']],
                ['cacheHit', __('dashboard.Cache hit'), $defaults['cache_hit']],
                ['noScript', __('dashboard.No start script'), $defaults['no_script']],
                ['autoStart', __('dashboard.Auto-start'), $defaults['auto_start']],
                ['exited', __('dashboard.Command exited'), $defaults['exited']],
                ['failed', __('dashboard.Autostart failed'), $defaults['failed']],
                ['shellUnavailable', __('dashboard.Shell unavailable'), $defaults['shell_unavailable']],
            ],
        ])->layoutData($this->layoutData());
    }

    protected function settingsSection(): string
    {
        return 'lab';
    }

    /**
     * @return array<string, string>
     */
    private function lineMap(): array
    {
        return [
            'waiting' => 'waiting',
            'noPackage' => 'no_package',
            'installing' => 'installing',
            'ready' => 'ready',
            'cacheHit' => 'cache_hit',
            'noScript' => 'no_script',
            'autoStart' => 'auto_start',
            'exited' => 'exited',
            'failed' => 'failed',
            'shellUnavailable' => 'shell_unavailable',
        ];
    }

    private function hydrateLab(SiteSettings $site): void
    {
        $bag = $site->bag('lab');
        $this->runtimeName = (string) ($bag['runtime_name'] ?? LabConsoleCopy::DEFAULT_NAME);

        foreach ($this->lineMap() as $property => $key) {
            $this->{$property} = (string) ($bag[$key] ?? '');
        }
    }
}
