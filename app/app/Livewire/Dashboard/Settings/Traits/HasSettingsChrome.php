<?php

namespace App\Livewire\Dashboard\Settings\Traits;

use App\Support\Ui\Pulse;
use Illuminate\Support\Facades\Gate;

trait HasSettingsChrome
{
    abstract protected function settingsSection(): string;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        return [
            'title' => $this->sectionTitle(),
            'breadcrumbs' => [
                ['label' => __('dashboard.Settings'), 'href' => route('dashboard.settings.index')],
                ['label' => $this->sectionTitle(), 'current' => true],
            ],
        ];
    }

    /**
     * @return list<array{key: string, label: string, route: string}>
     */
    protected function settingsNav(): array
    {
        return [
            ['key' => 'general', 'label' => __('dashboard.General'), 'route' => 'dashboard.settings.index'],
            ['key' => 'themes', 'label' => __('dashboard.Themes'), 'route' => 'dashboard.settings.themes'],
            ['key' => 'mail', 'label' => __('dashboard.Mail'), 'route' => 'dashboard.settings.mail'],
            ['key' => 'license', 'label' => __('dashboard.License'), 'route' => 'dashboard.settings.license'],
            ['key' => 'publish', 'label' => __('dashboard.Publish settings'), 'route' => 'dashboard.settings.publish'],
            ['key' => 'lab', 'label' => __('dashboard.Lab console'), 'route' => 'dashboard.settings.lab'],
            ['key' => 'gdpr', 'label' => __('dashboard.GDPR'), 'route' => 'dashboard.settings.gdpr'],
            ['key' => 'privacy', 'label' => __('dashboard.Privacy policy'), 'route' => 'dashboard.settings.privacy'],
            ['key' => 'terms', 'label' => __('dashboard.Terms'), 'route' => 'dashboard.settings.terms'],
        ];
    }

    protected function sectionTitle(): string
    {
        return match ($this->settingsSection()) {
            'themes' => __('dashboard.Themes'),
            'mail' => __('dashboard.Mail'),
            'license' => __('dashboard.License'),
            'publish' => __('dashboard.Publish settings'),
            'lab' => __('dashboard.Lab console'),
            'gdpr' => __('dashboard.GDPR'),
            'privacy' => __('dashboard.Privacy policy'),
            'terms' => __('dashboard.Terms'),
            default => __('dashboard.General'),
        };
    }

    protected function authorizeSettings(): void
    {
        Gate::authorize('settings.revise');
    }

    protected function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');

        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }

    protected function pulseFail(string $copy): void
    {
        $packet = Pulse::craft($copy, null, 'fail');

        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
