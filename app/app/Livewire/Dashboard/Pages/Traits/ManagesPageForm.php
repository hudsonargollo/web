<?php

namespace App\Livewire\Dashboard\Pages\Traits;

use App\Models\SitePage;
use App\Support\Content\PublicSlug;
use App\Support\Html\SafeHtml;
use Illuminate\Validation\Rule;

trait ManagesPageForm
{
    public string $title = '';

    public string $slug = '';

    public string $body = '';

    public bool $published = false;

    public function updatedTitle(mixed $value): void
    {
        $this->slug = PublicSlug::fromTitle((string) $value, '');
    }

    /**
     * @return array<string, mixed>
     */
    protected function pageRules(?SitePage $page = null): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'slug' => [
                'nullable',
                'string',
                'max:180',
                Rule::when(filled($this->slug), [
                    'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                    Rule::unique('site_pages', 'slug')->ignore($page?->id),
                    Rule::notIn(SitePage::BLOCKED_SLUGS),
                ]),
            ],
            'body' => ['nullable', 'string', 'max:80000'],
            'published' => ['boolean'],
        ];
    }

    protected function fillFromPage(SitePage $page): void
    {
        $this->title = $page->title;
        $this->slug = $page->slug;
        $this->body = (string) $page->body;
        $this->published = $page->published;
    }

    protected function persistPage(?SitePage $page = null): SitePage
    {
        $validated = $this->validate($this->pageRules($page));
        $title = trim((string) $validated['title']);
        $slug = trim((string) ($validated['slug'] ?? ''));
        if ($slug === '') {
            $slug = PublicSlug::fromTitle($title, 'page');
        }
        $slug = PublicSlug::unique('site_pages', $slug, $page?->id);

        abort_if(in_array($slug, SitePage::BLOCKED_SLUGS, true), 422);

        $payload = [
            'title' => $title,
            'slug' => $slug,
            'body' => SafeHtml::document((string) ($validated['body'] ?? '')),
            'published' => (bool) $validated['published'],
            'published_on' => $validated['published']
                ? ($page?->published_on?->toDateString() ?? now()->toDateString())
                : null,
        ];

        if ($page === null) {
            $page = SitePage::query()->create($payload);
        } else {
            $page->update($payload);
        }

        return $page->refresh();
    }
}
