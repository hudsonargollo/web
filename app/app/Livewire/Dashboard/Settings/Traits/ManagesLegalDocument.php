<?php

namespace App\Livewire\Dashboard\Settings\Traits;

use App\Support\Html\SafeHtml;
use App\Support\Site\SiteSettings;

trait ManagesLegalDocument
{
    public bool $published = false;

    public string $title = '';

    public string $body = '';

    public string $updatedOn = '';

    abstract protected function legalGroup(): string;

    public function mount(SiteSettings $site): void
    {
        $this->authorizeSettings();
        $this->hydrateLegal($site);
    }

    public function save(SiteSettings $site): void
    {
        $this->authorizeSettings();

        $validated = $this->validate([
            'published' => ['boolean'],
            'title' => ['nullable', 'string', 'max:160'],
            'body' => ['nullable', 'string', 'max:80000'],
            'updatedOn' => ['nullable', 'date'],
        ]);

        $site->put($this->legalGroup(), [
            'published' => (bool) $validated['published'],
            'title' => trim((string) $validated['title']),
            'body' => SafeHtml::document((string) $validated['body']),
            'updated_on' => (string) ($validated['updatedOn'] ?? ''),
        ]);

        $this->hydrateLegal($site);
        $this->pulseOk(__('dashboard.Settings saved.'));
    }

    protected function hydrateLegal(SiteSettings $site): void
    {
        $bag = $site->bag($this->legalGroup());
        $this->published = (bool) ($bag['published'] ?? false);
        $this->title = (string) ($bag['title'] ?? '');
        $this->body = (string) ($bag['body'] ?? '');
        $this->updatedOn = (string) ($bag['updated_on'] ?? '');
    }
}
