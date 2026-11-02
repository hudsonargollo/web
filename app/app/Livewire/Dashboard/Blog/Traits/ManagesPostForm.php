<?php

namespace App\Livewire\Dashboard\Blog\Traits;

use App\Models\BlogPost;
use App\Support\Content\PublicSlug;
use App\Support\Html\SafeHtml;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

trait ManagesPostForm
{
    public string $title = '';

    public string $slug = '';

    public string $excerpt = '';

    public string $body = '';

    public bool $published = false;

    public function updatedTitle(mixed $value): void
    {
        $this->slug = PublicSlug::fromTitle((string) $value, '');
    }

    /**
     * @return array<string, mixed>
     */
    protected function postRules(?BlogPost $post = null): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'slug' => [
                'nullable',
                'string',
                'max:180',
                Rule::when(filled($this->slug), [
                    'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                    Rule::unique('blog_posts', 'slug')->ignore($post?->id),
                ]),
            ],
            'excerpt' => ['nullable', 'string', 'max:400'],
            'body' => ['nullable', 'string', 'max:80000'],
            'published' => ['boolean'],
        ];
    }

    protected function fillFromPost(BlogPost $post): void
    {
        $this->title = $post->title;
        $this->slug = $post->slug;
        $this->excerpt = (string) $post->excerpt;
        $this->body = (string) $post->body;
        $this->published = $post->published;
    }

    protected function persistPost(?BlogPost $post = null): BlogPost
    {
        $validated = $this->validate($this->postRules($post));
        $title = trim((string) $validated['title']);
        $slug = trim((string) ($validated['slug'] ?? ''));
        if ($slug === '') {
            $slug = PublicSlug::fromTitle($title, 'post');
        }
        $slug = PublicSlug::unique('blog_posts', $slug, $post?->id);

        $payload = [
            'title' => $title,
            'slug' => $slug,
            'excerpt' => trim((string) ($validated['excerpt'] ?? '')),
            'body' => SafeHtml::document((string) ($validated['body'] ?? '')),
            'published' => (bool) $validated['published'],
            'published_on' => $validated['published']
                ? ($post?->published_on?->toDateString() ?? now()->toDateString())
                : null,
        ];

        if ($post === null) {
            $payload['author_id'] = Auth::id();
            $post = BlogPost::query()->create($payload);
        } else {
            $post->update($payload);
        }

        return $post->refresh();
    }
}
