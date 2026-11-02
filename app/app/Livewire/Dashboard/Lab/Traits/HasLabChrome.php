<?php

namespace App\Livewire\Dashboard\Lab\Traits;

use App\Support\Ui\Pulse;
use Illuminate\Support\Facades\Gate;

trait HasLabChrome
{
    abstract protected function labSection(): string;

    /**
     * @return array{title: string, breadcrumbs: list<array{label: string, href?: string, current?: bool}>}
     */
    public function layoutData(): array
    {
        $title = $this->sectionTitle();

        return [
            'title' => $title,
            'breadcrumbs' => [
                ['label' => __('dashboard.Lab'), 'href' => route('dashboard.lab.index')],
                ['label' => $title, 'current' => true],
            ],
        ];
    }

    protected function sectionTitle(): string
    {
        return match ($this->labSection()) {
            'usage' => __('dashboard.Usage'),
            'turns' => __('dashboard.Failed turns'),
            default => __('dashboard.Projects'),
        };
    }

    protected function authorizeLab(): void
    {
        Gate::authorize('projects.browse');
    }

    protected function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');

        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
