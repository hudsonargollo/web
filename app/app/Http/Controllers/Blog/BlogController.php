<?php

namespace App\Http\Controllers\Blog;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Support\Seo\PageSeo;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;

class BlogController extends Controller
{
    public function __invoke(SiteSettings $site, PageSeo $seo): View
    {
        $posts = BlogPost::query()
            ->released()
            ->get()
            ->filter(fn (BlogPost $post) => $post->isReleased())
            ->sortByDesc(fn (BlogPost $post) => $post->published_on?->timestamp ?? $post->updated_at?->timestamp)
            ->values();

        $seo->page([
            'title' => __('messages.Blog'),
            'canonical' => route('blog'),
            'type' => 'website',
            'jsonLd' => 'CollectionPage',
        ]);

        return view('blog.blog', [
            'site' => $site,
            'posts' => $posts,
        ]);
    }
}
