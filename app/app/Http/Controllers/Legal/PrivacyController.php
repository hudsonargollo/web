<?php

namespace App\Http\Controllers\Legal;

use App\Http\Controllers\Controller;
use App\Support\Html\SafeHtml;
use App\Support\Seo\PageSeo;
use App\Support\Site\SiteSettings;
use Illuminate\Contracts\View\View;

class PrivacyController extends Controller
{
    public function __invoke(SiteSettings $site, PageSeo $seo): View
    {
        abort_unless($site->privacyPublished(), 404);

        $bag = $site->bag('privacy');
        $title = filled($bag['title'] ?? null) ? (string) $bag['title'] : __('messages.Privacy policy');

        $seo->page([
            'title' => $title,
            'description' => PageSeo::excerpt((string) ($bag['body'] ?? '')),
            'canonical' => route('privacy'),
            'type' => 'website',
            'jsonLd' => 'WebPage',
        ]);

        return view('legal.privacy.privacy', [
            'site' => $site,
            'title' => $title,
            'updatedOn' => (string) ($bag['updated_on'] ?? ''),
            'html' => SafeHtml::document((string) ($bag['body'] ?? '')),
        ]);
    }
}
