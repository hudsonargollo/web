<?php

namespace App\Livewire\Dashboard\Languages;

use App\Models\Language;
use App\Support\Locale\PhraseCatalog;
use App\Support\Locale\PhraseLedger;
use App\Support\Site\SiteSettings;
use App\Support\Ui\Pulse;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Layout;
use Livewire\Component;

#[Layout('components.layouts.dashboard', ['skeleton' => 'table'])]
class LanguagesComponent extends Component
{
    public string $confirmPublicId = '';

    /**
     * @return array{title: string}
     */
    public function layoutData(): array
    {
        return [
            'title' => __('dashboard.Languages'),
        ];
    }

    public function mount(): void
    {
        Gate::authorize('languages.browse');
    }

    public function askRetire(string $publicId): void
    {
        Gate::authorize('languages.retire');
        $this->confirmPublicId = $publicId;
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-open', { detail: 'retire-language' }))");
    }

    public function confirmPending(SiteSettings $site): void
    {
        Gate::authorize('languages.retire');

        $publicId = $this->confirmPublicId;
        $this->reset('confirmPublicId');
        $this->js("window.dispatchEvent(new CustomEvent('krikkit-modal-close', { detail: 'retire-language' }))");

        $language = Language::query()->where('public_id', $publicId)->firstOrFail();

        if ($language->is_default) {
            $this->pulseFail(__('dashboard.The default language cannot be retired.'));

            return;
        }

        if ($site->locale() === $language->code) {
            $site->put('general', ['locale' => Language::defaultCode()]);
        }

        $language->delete();
        $this->pulseOk(__('dashboard.Language retired.'));
    }

    public function render(PhraseCatalog $catalog, PhraseLedger $ledger): View
    {
        $total = $catalog->totalCount();
        $filled = $ledger->filledCounts();

        return view('livewire.dashboard.languages.languages', [
            'languages' => Language::query()->orderByDesc('is_default')->orderBy('name')->get(),
            'totalPhrases' => $total,
            'filledCounts' => $filled,
            'sourceLocale' => PhraseCatalog::SOURCE,
        ])->layoutData($this->layoutData());
    }

    private function pulseOk(string $copy): void
    {
        $packet = Pulse::craft($copy, __('dashboard.Saved'), 'ok');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }

    private function pulseFail(string $copy): void
    {
        $packet = Pulse::craft($copy, null, 'fail');
        $this->js(
            'window.dispatchEvent(new CustomEvent('.json_encode(Pulse::EVENT).', { detail: '.json_encode($packet).' }))'
        );
    }
}
