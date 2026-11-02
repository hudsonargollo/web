<?php

namespace App\Support\Content;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PublicSlug
{
    public static function fromTitle(string $title, string $fallback = 'entry'): string
    {
        $slug = Str::slug($title);

        return $slug !== '' ? $slug : $fallback;
    }

    public static function unique(string $table, string $slug, ?int $ignoreId = null): string
    {
        $base = $slug;
        $n = 2;

        while (DB::table($table)
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()
        ) {
            $slug = $base.'-'.$n;
            $n++;
        }

        return $slug;
    }
}
