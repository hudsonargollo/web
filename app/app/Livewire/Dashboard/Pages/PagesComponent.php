<?php

namespace App\Livewire\Dashboard\Pages;

use App\Models\SitePage;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class PagesComponent extends Component
{
    public string $confirmPublicId = '';

    /**
     * @return array{title: string}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Pages'),
        ];
    }

    public function mount(): void
    {
        Gate::authorize('pages.browse');
    }

    public function askRetire(string $publicId): void
    {
        Gate::authorize('pages.retire');
        $this->confirmPublicId = $publicId;
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'retire-page' }))");
    }

    public function confirmPending(): void
    {
        Gate::authorize('pages.retire');

        $publicId = $this->confirmPublicId;
        $this->reset('confirmPublicId');
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'retire-page' }))");

        $page = SitePage::query()->where('public_id', $publicId)->firstOrFail();
        $page->delete();
        $this->pulseOk(__('dashboard.Page retired.'));
    }

    public function render(): View
    {
        return view('livewire.dashboard.pages.pages', [
            'pages' => SitePage::query()->latest('updated_at')->get(),
        ])->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
