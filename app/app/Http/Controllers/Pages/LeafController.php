<?php

namespace App\Http\Controllers\Pages;

use App\Http\Controllers\Controller;
use App\Models\SitePage;
use App\Support\Html\SafeHtml;
use App\Support\Seo\PageSeo;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;

class LeafController extends Controller
{
    public function __invoke(string $slug, SiteSettings $site, PageSeo $seo): View
    {
        $page = SitePage::query()->where('slug', $slug)->firstOrFail();
        abort_unless($page->isReleased(), 404);

        $seo->page([
            'title' => $page->title,
            'description' => PageSeo::excerpt((string) $page->body),
            'canonical' => route('pages.leaf', $page->slug),
            'type' => 'website',
            'jsonLd' => 'WebPage',
        ]);

        return view('pages.leaf.leaf', [
            'site' => $site,
            'page' => $page,
            'html' => SafeHtml::document((string) $page->body),
        ]);
    }
}
