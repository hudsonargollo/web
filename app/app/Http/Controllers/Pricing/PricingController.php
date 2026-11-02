<?php

namespace App\Http\Controllers\Pricing;

use App\Http\Controllers\Controller;
use App\Support\Content\PublicIndex;
use App\Support\Seo\PageSeo;
use App\Support\Site\HomePacks;
use App\Support\Site\LandingCopy;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;

class PricingController extends Controller
{
    public function __invoke(SiteSettings $site, LandingCopy $landing, PageSeo $seo): View
    {
        $seo->page([
            'title' => __('home.Pricing'),
            'description' => __('home.Start on Free. Move to Pro or Agency when the desk needs more credits, domains, or GitHub.'),
            'canonical' => route('pricing'),
            'type' => 'website',
            'jsonLd' => 'WebPage',
        ]);

        return view('pricing.pricing', [
            'site' => $site,
            'landing' => $landing,
            'hasBlog' => PublicIndex::blogIsLive(),
            'packs' => HomePacks::cards(),
            'comparison' => HomePacks::comparison(),
        ]);
    }
}
