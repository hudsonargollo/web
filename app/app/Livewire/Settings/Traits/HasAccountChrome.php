<?php

namespace App\Livewire\Settings\Traits;

use App\Support\Seo\PageSeo;
use App\Support\Ui\Pulse;
use Illuminate\Support\Facades\Gate;

trait HasAccountChrome
{
    abstract protected function deskSection(): string;

    protected function authorizeDesk(): void
    {
        Gate::authorize('security.self');
    }

    protected function hydrateDeskSeo(PageSeo $seo): void
    {
        $seo->page(['title' => $this->deskTitle()]);
    }

    protected function deskTitle(): string
    {
        return match ($this->deskSection()) {
            'profile' => __('settings.Profile'),
            'password' => __('settings.Password'),
            'two-factor' => __('settings.Two-factor'),
            'applications' => __('settings.Applications'),
            'subscription' => __('settings.Subscription'),
            'credits' => __('settings.Credits'),
            'usage' => __('settings.Usage'),
            default => __('settings.General Settings'),
        };
    }

    /**
     * @return list<array{key: string, label: string, route: string}>
     */
    protected function profileTabs(): array
    {
        return [
            ['key' => 'profile', 'label' => __('settings.Profile'), 'route' => 'settings.profile'],
            ['key' => 'password', 'label' => __('settings.Password'), 'route' => 'settings.password'],
            ['key' => 'two-factor', 'label' => __('settings.Two-factor'), 'route' => 'settings.two-factor'],
        ];
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
