<?php

namespace App\Http\Controllers\Pages;

use App\Http\Controllers\Controller;
use App\Models\SitePage;
use App\Support\Seo\PageSeo;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;

class PagesController extends Controller
{
    public function __invoke(SiteSettings $site, PageSeo $seo): View
    {
        $pages = SitePage::query()
            ->released()
            ->get()
            ->filter(fn (SitePage $page) => $page->isReleased())
            ->sortBy('title')
            ->values();

        $seo->page([
            'title' => __('messages.Pages'),
            'canonical' => route('pages'),
            'type' => 'website',
            'jsonLd' => 'CollectionPage',
        ]);

        return view('pages.pages', [
            'site' => $site,
            'pages' => $pages,
        ]);
    }
}
