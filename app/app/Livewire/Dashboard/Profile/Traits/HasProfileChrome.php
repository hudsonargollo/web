<?php

namespace App\Livewire\Dashboard\Profile\Traits;

use App\Support\Ui\Pulse;
use Illuminate\Support\Facades\Gate;

trait HasProfileChrome
{
    abstract protected function profileSection(): string;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $title = $this->sectionTitle();
        $profile = (string) __('dashboard.Profile');

        return [
            'title' => $title,
            'breadcrumbs' => $this->profileSection() === 'profile'
                ? [['label' => $profile, 'current' => true]]
                : [
                    ['label' => $profile, 'href' => route('dashboard.profile.index')],
                    ['label' => $title, 'current' => true],
                ],
        ];
    }

    /**
     * @return list<array{key: string, label: string, route: string}>
     */
    protected function profileNav(): array
    {
        return [
            ['key' => 'profile', 'label' => __('dashboard.Profile'), 'route' => 'dashboard.profile.index'],
            ['key' => 'password', 'label' => __('dashboard.Password'), 'route' => 'dashboard.profile.password'],
            ['key' => 'two-factor', 'label' => __('dashboard.Two-factor'), 'route' => 'dashboard.profile.two-factor'],
        ];
    }

    protected function sectionTitle(): string
    {
        return match ($this->profileSection()) {
            'password' => __('dashboard.Password'),
            'two-factor' => __('dashboard.Two-factor'),
            default => __('dashboard.Profile'),
        };
    }

    protected function authorizeProfile(): void
    {
        Gate::authorize('security.self');
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
