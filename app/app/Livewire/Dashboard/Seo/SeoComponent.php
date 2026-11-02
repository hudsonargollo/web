<?php

namespace App\Livewire\Dashboard\Seo;

use App\Livewire\Dashboard\Settings\Traits\ManagesSiteAssets;
use App\Support\Seo\PageSeo;
use App\Support\Site\SiteSettings;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class SeoComponent extends Component
{
    use ManagesSiteAssets;
    use WithFileUploads;

    public string $metaTitle = '';

    public string $metaDescription = '';

    public string $metaKeywords = '';

    public string $titleHome = '';

    public string $titleDashboard = '';

    public string $titleLab = '';

    public bool $robotsIndex = true;

    public bool $robotsFollow = true;

    public string $canonical = '';

    public string $ogTitle = '';

    public string $ogDescription = '';

    public string $twitterHandle = '';

    public string $analyticsId = '';

    public string $searchConsole = '';

    public ?TemporaryUploadedFile $ogImage = null;

    public bool $removeOgImage = false;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.SEO'),
            'breadcrumbs' => [
                ['label' => __('dashboard.SEO'), 'current' => true],
            ],
        ];
    }

    public function mount(SiteSettings $site): void
    {
        Gate::authorize('settings.revise');
        $this->hydrateSeo($site);
    }

    public function dropAsset(string $key): void
    {
        $this->clearAsset($key, ['ogImage']);
    }

    public function updatedOgImage(): void
    {
        $this->removeOgImage = false;
    }

    public function save(SiteSettings $site): void
    {
        Gate::authorize('settings.revise');

        $validated = $this->validate([
            'metaTitle' => ['nullable', 'string', 'max:70'],
            'metaDescription' => ['nullable', 'string', 'max:200'],
            'metaKeywords' => ['nullable', 'string', 'max:255'],
            'titleHome' => ['nullable', 'string', 'max:80'],
            'titleDashboard' => ['nullable', 'string', 'max:80'],
            'titleLab' => ['nullable', 'string', 'max:80'],
            'robotsIndex' => ['boolean'],
            'robotsFollow' => ['boolean'],
            'canonical' => array_values(array_filter(['nullable', 'string', 'max:255', filled($this->canonical) ? 'url' : null])),
            'ogTitle' => ['nullable', 'string', 'max:70'],
            'ogDescription' => ['nullable', 'string', 'max:200'],
            'twitterHandle' => ['nullable', 'string', 'max:40'],
            'analyticsId' => ['nullable', 'string', 'max:40'],
            'searchConsole' => ['nullable', 'string', 'max:120'],
            'ogImage' => ['nullable', 'file', 'max:2048', 'mimes:png,jpg,jpeg,webp,gif'],
        ]);

        $seo = $site->bag('seo');

        $site->put('seo', [
            'meta_title' => trim((string) $validated['metaTitle']),
            'meta_description' => trim((string) $validated['metaDescription']),
            'meta_keywords' => trim((string) $validated['metaKeywords']),
            'title_home' => $this->persistPattern((string) $validated['titleHome'], PageSeo::TITLE_HOME),
            'title_dashboard' => $this->persistPattern((string) $validated['titleDashboard'], PageSeo::TITLE_DASHBOARD),
            'title_lab' => $this->persistPattern((string) $validated['titleLab'], PageSeo::TITLE_LAB),
            'robots_index' => (bool) $validated['robotsIndex'],
            'robots_follow' => (bool) $validated['robotsFollow'],
            'canonical' => trim((string) $validated['canonical']),
            'og_title' => trim((string) $validated['ogTitle']),
            'og_description' => trim((string) $validated['ogDescription']),
            'twitter_handle' => ltrim(trim((string) $validated['twitterHandle']), '@'),
            'analytics_id' => trim((string) $validated['analyticsId']),
            'search_console' => trim((string) $validated['searchConsole']),
            'og_image' => $this->persistAsset('ogImage', $seo['og_image'] ?? null, 'site', $this->removeOgImage),
        ]);

        $this->hydrateSeo($site);
        $this->pulseOk(__('dashboard.Settings saved.'));
    }

    public function render(SiteSettings $site): View
    {
        $seo = $site->bag('seo');

        return view('livewire.dashboard.seo.seo', [
            'ogPreview' => $this->previewUrl($this->ogImage, $seo['og_image'] ?? null, $this->removeOgImage),
            'titleHomeDefault' => PageSeo::TITLE_HOME,
            'titleDashboardDefault' => PageSeo::TITLE_DASHBOARD,
            'titleLabDefault' => PageSeo::TITLE_LAB,
        ])->layoutData($this->layoutData());
    }

    private function hydrateSeo(SiteSettings $site): void
    {
        $bag = $site->bag('seo');
        $this->metaTitle = (string) ($bag['meta_title'] ?? '');
        $this->metaDescription = (string) ($bag['meta_description'] ?? '');
        $this->metaKeywords = (string) ($bag['meta_keywords'] ?? '');
        $this->titleHome = (string) ($bag['title_home'] ?? PageSeo::TITLE_HOME);
        $this->titleDashboard = (string) ($bag['title_dashboard'] ?? PageSeo::TITLE_DASHBOARD);
        $this->titleLab = (string) ($bag['title_lab'] ?? PageSeo::TITLE_LAB);
        $this->robotsIndex = (bool) ($bag['robots_index'] ?? true);
        $this->robotsFollow = (bool) ($bag['robots_follow'] ?? true);
        $this->canonical = (string) ($bag['canonical'] ?? '');
        $this->ogTitle = (string) ($bag['og_title'] ?? '');
        $this->ogDescription = (string) ($bag['og_description'] ?? '');
        $this->twitterHandle = (string) ($bag['twitter_handle'] ?? '');
        $this->analyticsId = (string) ($bag['analytics_id'] ?? '');
        $this->searchConsole = (string) ($bag['search_console'] ?? '');
        $this->ogImage = null;
        $this->removeOgImage = false;
    }

    private function persistPattern(string $value, string $fallback): string
    {
        $value = trim($value);

        return $value !== '' ? $value : $fallback;
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');

        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
