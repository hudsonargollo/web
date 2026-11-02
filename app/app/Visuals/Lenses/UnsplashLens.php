<?php

namespace App\Visuals\Lenses;

use App\Visuals\VisualHit;
use App\Visuals\VisualHttp;
use Throwable;

/**
 * Unsplash Search Photos — public CDN URLs, photographer credit in the hit.
 */
final class UnsplashLens
{
    public const ID = 'unsplash';

    /**
     * @return list<VisualHit>
     */
    public function search(string $accessKey, string $query, int $count, ?string $orientation): array
    {
        $params = [
            'query' => $query,
            'per_page' => $count,
            'content_filter' => 'high',
        ];

        $mapped = match ($orientation) {
            'landscape' => 'landscape',
            'portrait' => 'portrait',
            'square' => 'squarish',
            default => null,
        };
        if ($mapped !== null) {
            $params['orientation'] = $mapped;
        }

        try {
            $response = VisualHttp::make()
                ->withHeaders(['Authorization' => 'Client-ID '.$accessKey])
                ->get((string) config('visuals.catalogs.unsplash.search_url'), $params);
        } catch (Throwable) {
            return [];
        }

        if (! $response->successful()) {
            return [];
        }

        /** @var list<array<string, mixed>> $rows */
        $rows = $response->json('results') ?? [];
        $hits = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $urls = is_array($row['urls'] ?? null) ? $row['urls'] : [];
            $src = trim((string) ($urls['regular'] ?? $urls['full'] ?? $urls['small'] ?? ''));
            if ($src === '' || ! str_starts_with($src, 'https://')) {
                continue;
            }

            $user = is_array($row['user'] ?? null) ? $row['user'] : [];
            $userLinks = is_array($user['links'] ?? null) ? $user['links'] : [];
            $photoLinks = is_array($row['links'] ?? null) ? $row['links'] : [];
            $alt = trim((string) ($row['alt_description'] ?? $row['description'] ?? $query));
            $credit = trim((string) ($user['name'] ?? $user['username'] ?? 'Unsplash'));
            $href = trim((string) ($photoLinks['html'] ?? $userLinks['html'] ?? 'https://unsplash.com'));

            $hits[] = new VisualHit(
                src: $src,
                thumb: trim((string) ($urls['thumb'] ?? $urls['small'] ?? $src)) ?: $src,
                alt: $alt !== '' ? $alt : $query,
                credit: $credit !== '' ? $credit : 'Unsplash',
                href: str_starts_with($href, 'https://') ? $href : 'https://unsplash.com',
                catalog: self::ID,
                width: isset($row['width']) ? (int) $row['width'] : null,
                height: isset($row['height']) ? (int) $row['height'] : null,
            );
        }

        return $hits;
    }
}
