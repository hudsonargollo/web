<?php

namespace App\Livewire\Dashboard\Settings\Options;

use App\Livewire\Dashboard\Settings\Traits\HasSettingsChrome;
use App\Support\Site\SiteSettings;
use App\Support\Ui\ThemePalette;
use Illuminate\Contracts\View\View;
use Illuminate\Validation\Rule;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class ThemesComponent extends Component
{
    use HasSettingsChrome;

    public string $accent = 'base';

    public string $base = 'neutral';

    public string $mode = 'system';

    public bool $lockMembers = false;

    public function mount(SiteSettings $site): void
    {
        $this->authorizeSettings();
        $this->hydrateTheme($site);
    }

    public function save(SiteSettings $site, ?string $accent = null, ?string $base = null, ?string $mode = null): void
    {
        $this->authorizeSettings();

        if (is_string($accent) && $accent !== '') {
            $this->accent = $accent;
        }

        if (is_string($base) && $base !== '') {
            $this->base = $base;
        }

        if (is_string($mode) && $mode !== '') {
            $this->mode = $mode;
        }

        $validated = $this->validate([
            'accent' => ['required', 'string', Rule::in(ThemePalette::accentIds())],
            'base' => ['required', 'string', Rule::in(ThemePalette::baseIds())],
            'mode' => ['required', 'string', Rule::in(['light', 'dark', 'system'])],
            'lockMembers' => ['boolean'],
        ]);

        $site->put('theme', [
            'accent' => $validated['accent'],
            'base' => $validated['base'],
            'mode' => $validated['mode'],
            'lock_members' => (bool) $validated['lockMembers'],
        ]);

        $this->hydrateTheme($site);

        $applied = ThemePalette::normalize([
            'accent' => $validated['accent'],
            'base' => $validated['base'],
            'mode' => in_array($validated['mode'], ['light', 'dark'], true) ? $validated['mode'] : 'light',
        ]);

        if ($applied !== null) {
            $this->js(
                'window.krikkitTheme?.apply('.json_encode([
                    ...$applied,
                    'persist' => true,
                ]).');'
            );
        }

        $this->pulseOk(__('dashboard.Settings saved.'));
    }

    public function render(): View
    {
        return view('livewire.dashboard.settings.options.themes', [
            'section' => $this->settingsSection(),
            'nav' => $this->settingsNav(),
            'accents' => ThemePalette::accents(),
            'bases' => ThemePalette::bases(),
        ])->layoutData($this->layoutData());
    }

    protected function settingsSection(): string
    {
        return 'themes';
    }

    private function hydrateTheme(SiteSettings $site): void
    {
        $theme = $site->theme();
        $this->accent = $theme['accent'];
        $this->base = $theme['base'];
        $this->mode = $theme['mode'];
        $this->lockMembers = $theme['lock_members'];
    }
}
