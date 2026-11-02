<?php

namespace App\Livewire\Dashboard\Settings\Options;

use App\Livewire\Dashboard\Settings\Traits\HasSettingsChrome;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'form'])]
class GdprComponent extends Component
{
    use HasSettingsChrome;

    public bool $enabled = false;

    public string $title = '';

    public string $message = '';

    public string $acceptLabel = '';

    public string $rejectLabel = '';

    public bool $showReject = true;

    public bool $consentAnalytics = true;

    public string $controllerName = '';

    public string $controllerEmail = '';

    public function mount(SiteSettings $site): void
    {
        $this->authorizeSettings();
        $this->hydrateGdpr($site);
    }

    public function save(SiteSettings $site): void
    {
        $this->authorizeSettings();

        $validated = $this->validate([
            'enabled' => ['boolean'],
            'title' => ['nullable', 'string', 'max:80'],
            'message' => ['nullable', 'string', 'max:500'],
            'acceptLabel' => ['nullable', 'string', 'max:40'],
            'rejectLabel' => ['nullable', 'string', 'max:40'],
            'showReject' => ['boolean'],
            'consentAnalytics' => ['boolean'],
            'controllerName' => ['nullable', 'string', 'max:160'],
            'controllerEmail' => ['nullable', 'email', 'max:255'],
        ]);

        $site->put('gdpr', [
            'enabled' => (bool) $validated['enabled'],
            'title' => trim((string) $validated['title']),
            'message' => trim((string) $validated['message']),
            'accept_label' => trim((string) $validated['acceptLabel']),
            'reject_label' => trim((string) $validated['rejectLabel']),
            'show_reject' => (bool) $validated['showReject'],
            'consent_analytics' => (bool) $validated['consentAnalytics'],
            'controller_name' => trim((string) $validated['controllerName']),
            'controller_email' => trim((string) $validated['controllerEmail']),
        ]);

        $this->hydrateGdpr($site);
        $this->pulseOk(__('dashboard.Settings saved.'));
    }

    public function render(): View
    {
        return view('livewire.dashboard.settings.options.gdpr', [
            'section' => $this->settingsSection(),
            'nav' => $this->settingsNav(),
        ])->layoutData($this->layoutData());
    }

    protected function settingsSection(): string
    {
        return 'gdpr';
    }

    private function hydrateGdpr(SiteSettings $site): void
    {
        $bag = $site->bag('gdpr');
        $this->enabled = (bool) ($bag['enabled'] ?? false);
        $this->title = $this->filledOr($bag['title'] ?? '', __('messages.We use cookies'));
        $this->message = $this->filledOr($bag['message'] ?? '', __('messages.We use essential cookies to run this site. Optional analytics stay off until you accept.'));
        $this->acceptLabel = $this->filledOr($bag['accept_label'] ?? '', __('messages.Accept'));
        $this->rejectLabel = $this->filledOr($bag['reject_label'] ?? '', __('messages.Reject'));
        $this->showReject = (bool) ($bag['show_reject'] ?? true);
        $this->consentAnalytics = (bool) ($bag['consent_analytics'] ?? true);
        $this->controllerName = (string) ($bag['controller_name'] ?? '');
        $this->controllerEmail = (string) ($bag['controller_email'] ?? '');
    }

    private function filledOr(mixed $value, string $fallback): string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : $fallback;
    }
}
