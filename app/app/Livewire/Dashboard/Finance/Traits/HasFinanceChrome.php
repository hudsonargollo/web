<?php

namespace App\Livewire\Dashboard\Finance\Traits;

use App\Support\Ui\Pulse;
use Illuminate\Support\Facades\Gate;

trait HasFinanceChrome
{
    abstract protected function financeSection(): string;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $title = $this->sectionTitle();

        return [
            'title' => $title,
            'breadcrumbs' => [
                ['label' => __('dashboard.Finance'), 'href' => route('dashboard.finance.index')],
                ['label' => $title, 'current' => true],
            ],
        ];
    }

    /**
     * @return list<array{key: string, label: string, route: string}>
     */
    protected function financeNav(): array
    {
        return [
            ['key' => 'overview', 'label' => __('dashboard.Overview'), 'route' => 'dashboard.finance.index'],
            ['key' => 'subscriptions', 'label' => __('dashboard.Subscriptions'), 'route' => 'dashboard.finance.subscriptions.index'],
            ['key' => 'events', 'label' => __('dashboard.Events'), 'route' => 'dashboard.finance.events.index'],
        ];
    }

    protected function sectionTitle(): string
    {
        return match ($this->financeSection()) {
            'subscriptions' => __('dashboard.Subscriptions'),
            'events' => __('dashboard.Events'),
            default => __('dashboard.Finance'),
        };
    }

    protected function authorizeFinance(): void
    {
        Gate::authorize('finance.browse');
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
