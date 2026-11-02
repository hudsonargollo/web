<?php

namespace App\Support\Content;

use App\Models\BlogPost;
use App\Models\SitePage;
use Illuminate\Support\Facades\Schema;

final class PublicIndex
{
    public static function blogIsLive(): bool
    {
        if (! Schema::hasTable('blog_posts')) {
            return false;
        }

        return BlogPost::query()->released()->get()->contains(
            fn (BlogPost $post): bool => $post->isReleased()
        );
    }

    public static function pagesAreLive(): bool
    {
        if (! Schema::hasTable('site_pages')) {
            return false;
        }

        return SitePage::query()->released()->get()->contains(
            fn (SitePage $page): bool => $page->isReleased()
        );
    }
}
