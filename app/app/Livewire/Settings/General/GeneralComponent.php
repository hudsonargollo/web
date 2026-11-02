<?php

namespace App\Livewire\Settings\General;

use App\Ai\ModelCatalog;
use App\Livewire\Settings\Traits\HasAccountChrome;
use App\Support\Account\DeskPreferences;
use App\Support\Seo\PageSeo;
use App\Support\Site\SiteSettings;
use App\Support\Ui\ThemePalette;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.app')]
class GeneralComponent extends Component
{
    use HasAccountChrome;

    public string $mode = 'system';

    public bool $showTokenUsage = false;

    public bool $soundAlerts = true;

    public string $defaultModel = '';

    protected function deskSection(): string
    {
        return 'general';
    }

    public function mount(PageSeo $seo, ModelCatalog $catalog): void
    {
        $this->authorizeDesk();
        $this->hydrateDeskSeo($seo);

        $user = auth()->user();
        $prefs = DeskPreferences::for($user);
        $appearance = ThemePalette::normalize($user->appearance);

        $this->mode = is_array($appearance) ? (string) $appearance['mode'] : 'system';
        $this->showTokenUsage = $prefs['show_token_usage'];
        $this->soundAlerts = $prefs['sound_alerts'];
        $this->defaultModel = DeskPreferences::preferredModelId($user, $catalog);
    }

    public function updatedMode(): void
    {
        $this->persistTheme();
    }

    public function updatedShowTokenUsage(): void
    {
        $this->persistPrefs();
    }

    public function updatedSoundAlerts(): void
    {
        $this->persistPrefs();
    }

    public function updatedDefaultModel(): void
    {
        $this->persistPrefs();
    }

    public function render(ModelCatalog $catalog, SiteSettings $site): View
    {
        $theme = $site->theme();

        return view('livewire.settings.general.general', [
            'section' => $this->deskSection(),
            'models' => $catalog->all(onlyAvailable: true),
            'themeLocked' => (bool) ($theme['lock_members'] ?? false),
        ]);
    }

    private function persistTheme(): void
    {
        $this->authorizeDesk();

        $site = app(SiteSettings::class)->theme();

        if (($site['lock_members'] ?? false) === true) {
            return;
        }

        $mode = in_array($this->mode, ['light', 'dark', 'system'], true) ? $this->mode : 'system';
        $current = ThemePalette::normalize(auth()->user()->appearance) ?? [
            'accent' => (string) ($site['accent'] ?? 'base'),
            'base' => (string) ($site['base'] ?? 'neutral'),
            'mode' => $mode,
        ];
        $current['mode'] = $mode;

        auth()->user()->forceFill(['appearance' => $current])->save();

        $this->js(
            'window.krikkitTheme && window.krikkitTheme.apply({ mode: '.json_encode($mode).', persist: true })'
        );
    }

    private function persistPrefs(): void
    {
        $this->authorizeDesk();

        $catalog = app(ModelCatalog::class);
        $model = trim($this->defaultModel);

        if ($model !== '' && ! $catalog->has($model)) {
            $this->addError('defaultModel', __('settings.That model is not available.'));

            return;
        }

        DeskPreferences::merge(auth()->user(), [
            'show_token_usage' => $this->showTokenUsage,
            'sound_alerts' => $this->soundAlerts,
            'default_model' => $model,
        ]);
    }
}
