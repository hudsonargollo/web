<?php

namespace App\Livewire\Dashboard\Settings;

use App\Finance\Currencies;
use App\Livewire\Dashboard\Settings\Traits\HasSettingsChrome;
use App\Livewire\Dashboard\Settings\Traits\ManagesSiteAssets;
use App\Models\Language;
use App\Support\Geography\Timezones;
use App\Support\Site\SiteSettings;
use Cknow\Money\Rules\Currency;
use Illuminate\Contracts\View\View;
use Illuminate\Validation\Rule;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class SettingsComponent extends Component
{
    use HasSettingsChrome;
    use ManagesSiteAssets;
    use WithFileUploads;

    public string $name = '';

    public string $tagline = '';

    public string $url = '';

    public string $supportEmail = '';

    public string $contactEmail = '';

    public string $legalName = '';

    public string $copyright = '';

    public string $locale = 'en';

    public string $timezone = 'UTC';

    public string $currency = 'USD';

    public bool $allowRegistration = true;

    public bool $maintenance = false;

    public string $maintenanceMessage = '';

    public string $socialX = '';

    public string $socialGithub = '';

    public string $socialDiscord = '';

    public string $socialLinkedin = '';

    public ?TemporaryUploadedFile $logoLight = null;

    public ?TemporaryUploadedFile $logoDark = null;

    public ?TemporaryUploadedFile $favicon = null;

    public ?TemporaryUploadedFile $appleTouch = null;

    public ?TemporaryUploadedFile $iconLight = null;

    public ?TemporaryUploadedFile $iconDark = null;

    public bool $removeLogoLight = false;

    public bool $removeLogoDark = false;

    public bool $removeFavicon = false;

    public bool $removeAppleTouch = false;

    public bool $removeIconLight = false;

    public bool $removeIconDark = false;

    public function mount(SiteSettings $site): void
    {
        $this->authorizeSettings();
        $this->hydrateGeneral($site);
    }

    public function dropAsset(string $key): void
    {
        $this->clearAsset($key, [
            'logoLight', 'logoDark', 'favicon', 'appleTouch', 'iconLight', 'iconDark',
        ]);
    }

    public function updatedLogoLight(): void
    {
        $this->removeLogoLight = false;
    }

    public function updatedLogoDark(): void
    {
        $this->removeLogoDark = false;
    }

    public function updatedFavicon(): void
    {
        $this->removeFavicon = false;
    }

    public function updatedAppleTouch(): void
    {
        $this->removeAppleTouch = false;
    }

    public function updatedIconLight(): void
    {
        $this->removeIconLight = false;
    }

    public function updatedIconDark(): void
    {
        $this->removeIconDark = false;
    }

    public function save(SiteSettings $site): void
    {
        $this->authorizeSettings();

        $validated = $this->validate($this->rules());
        $general = $site->bag('general');

        $site->put('general', [
            'name' => trim((string) $validated['name']),
            'tagline' => trim((string) $validated['tagline']),
            'url' => trim((string) $validated['url']),
            'support_email' => trim((string) $validated['supportEmail']),
            'contact_email' => trim((string) $validated['contactEmail']),
            'legal_name' => trim((string) $validated['legalName']),
            'copyright' => trim((string) $validated['copyright']),
            'locale' => (string) $validated['locale'],
            'timezone' => (string) $validated['timezone'],
            'currency' => strtoupper((string) $validated['currency']),
            'allow_registration' => (bool) $validated['allowRegistration'],
            'maintenance' => (bool) $validated['maintenance'],
            'maintenance_message' => trim((string) $validated['maintenanceMessage']),
            'social_x' => trim((string) $validated['socialX']),
            'social_github' => trim((string) $validated['socialGithub']),
            'social_discord' => trim((string) $validated['socialDiscord']),
            'social_linkedin' => trim((string) $validated['socialLinkedin']),
            'logo_light' => $this->persistAsset('logoLight', $general['logo_light'] ?? null, 'site', $this->removeLogoLight),
            'logo_dark' => $this->persistAsset('logoDark', $general['logo_dark'] ?? null, 'site', $this->removeLogoDark),
            'favicon' => $this->persistAsset('favicon', $general['favicon'] ?? null, 'site', $this->removeFavicon),
            'apple_touch' => $this->persistAsset('appleTouch', $general['apple_touch'] ?? null, 'site', $this->removeAppleTouch),
            'icon_light' => $this->persistAsset('iconLight', $general['icon_light'] ?? null, 'site', $this->removeIconLight),
            'icon_dark' => $this->persistAsset('iconDark', $general['icon_dark'] ?? null, 'site', $this->removeIconDark),
        ]);

        $site->applyMoneyConfig();
        $this->hydrateGeneral($site);
        $this->pulseOk(__('dashboard.Settings saved.'));
    }

    public function render(SiteSettings $site): View
    {
        $general = $site->bag('general');

        return view('livewire.dashboard.settings.settings', [
            'section' => $this->settingsSection(),
            'nav' => $this->settingsNav(),
            'timezones' => Timezones::identifiers(),
            'locales' => Language::options(),
            'currencies' => Currencies::options(),
            'previews' => [
                'logoLight' => $this->previewUrl($this->logoLight, $general['logo_light'] ?? null, $this->removeLogoLight),
                'logoDark' => $this->previewUrl($this->logoDark, $general['logo_dark'] ?? null, $this->removeLogoDark),
                'favicon' => $this->previewUrl($this->favicon, $general['favicon'] ?? null, $this->removeFavicon),
                'appleTouch' => $this->previewUrl($this->appleTouch, $general['apple_touch'] ?? null, $this->removeAppleTouch),
                'iconLight' => $this->previewUrl($this->iconLight, $general['icon_light'] ?? null, $this->removeIconLight),
                'iconDark' => $this->previewUrl($this->iconDark, $general['icon_dark'] ?? null, $this->removeIconDark),
            ],
        ])->layoutData($this->layoutData());
    }

    protected function settingsSection(): string
    {
        return 'general';
    }

    /**
     * @return array<string, list<string>>
     */
    private function rules(): array
    {
        $image = ['nullable', 'file', 'max:2048', 'mimes:png,jpg,jpeg,webp,svg,gif'];
        $icon = ['nullable', 'file', 'max:1024', 'mimes:png,jpg,jpeg,webp,svg,ico,gif'];

        return [
            'name' => ['required', 'string', 'max:80'],
            'tagline' => ['nullable', 'string', 'max:160'],
            'url' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->url) ? 'url' : null])),
            'supportEmail' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->supportEmail) ? 'email' : null])),
            'contactEmail' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->contactEmail) ? 'email' : null])),
            'legalName' => ['nullable', 'string', 'max:160'],
            'copyright' => ['nullable', 'string', 'max:200'],
            'locale' => ['required', 'string', Rule::in(array_keys(Language::options()))],
            'timezone' => ['required', 'timezone'],
            'currency' => ['required', 'string', 'size:3', new Currency],
            'allowRegistration' => ['boolean'],
            'maintenance' => ['boolean'],
            'maintenanceMessage' => ['nullable', 'string', 'max:400'],
            'socialX' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->socialX) ? 'url' : null])),
            'socialGithub' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->socialGithub) ? 'url' : null])),
            'socialDiscord' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->socialDiscord) ? 'url' : null])),
            'socialLinkedin' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->socialLinkedin) ? 'url' : null])),
            'logoLight' => $image,
            'logoDark' => $image,
            'favicon' => $icon,
            'appleTouch' => $image,
            'iconLight' => $icon,
            'iconDark' => $icon,
        ];
    }

    private function hydrateGeneral(SiteSettings $site): void
    {
        $bag = $site->bag('general');

        $this->name = (string) ($bag['name'] ?? '');
        $this->tagline = (string) ($bag['tagline'] ?? '');
        $this->url = (string) ($bag['url'] ?? '');
        $this->supportEmail = (string) ($bag['support_email'] ?? '');
        $this->contactEmail = (string) ($bag['contact_email'] ?? '');
        $this->legalName = (string) ($bag['legal_name'] ?? '');
        $this->copyright = (string) ($bag['copyright'] ?? '');
        $this->locale = (string) ($bag['locale'] ?? 'en');
        $this->timezone = (string) ($bag['timezone'] ?? config('app.timezone', 'UTC'));
        $this->currency = strtoupper((string) ($bag['currency'] ?? $site->currency()));
        $this->allowRegistration = (bool) ($bag['allow_registration'] ?? true);
        $this->maintenance = (bool) ($bag['maintenance'] ?? false);
        $this->maintenanceMessage = (string) ($bag['maintenance_message'] ?? '');
        $this->socialX = (string) ($bag['social_x'] ?? '');
        $this->socialGithub = (string) ($bag['social_github'] ?? '');
        $this->socialDiscord = (string) ($bag['social_discord'] ?? '');
        $this->socialLinkedin = (string) ($bag['social_linkedin'] ?? '');
        $this->logoLight = null;
        $this->logoDark = null;
        $this->favicon = null;
        $this->appleTouch = null;
        $this->iconLight = null;
        $this->iconDark = null;
        $this->removeLogoLight = false;
        $this->removeLogoDark = false;
        $this->removeFavicon = false;
        $this->removeAppleTouch = false;
        $this->removeIconLight = false;
        $this->removeIconDark = false;
    }
}
