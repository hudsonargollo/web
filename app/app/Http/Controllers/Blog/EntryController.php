<?php

namespace App\Http\Controllers\Blog;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Support\Html\SafeHtml;
use App\Support\Seo\PageSeo;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;

class EntryController extends Controller
{
    public function __invoke(string $slug, SiteSettings $site, PageSeo $seo): View
    {
        $post = BlogPost::query()->where('slug', $slug)->firstOrFail();
        abort_unless($post->isReleased(), 404);

        $seo->page([
            'title' => $post->title,
            'description' => filled($post->excerpt)
                ? (string) $post->excerpt
                : PageSeo::excerpt((string) $post->body),
            'canonical' => route('blog.entry', $post->slug),
            'type' => 'article',
            'jsonLd' => 'Article',
            'published' => $post->published_on,
        ]);

        return view('blog.entry.entry', [
            'site' => $site,
            'post' => $post,
            'html' => SafeHtml::document((string) $post->body),
        ]);
    }
}
