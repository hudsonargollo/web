<?php

namespace App\Visuals\Lenses;

use App\Visuals\VisualHit;
use App\Visuals\VisualHttp;
use Throwable;

/**
 * Pixabay photo search — public CDN URLs with photographer credit.
 */
final class PixabayLens
{
    public const ID = 'pixabay';

    /**
     * @return list<VisualHit>
     */
    public function search(string $apiKey, string $query, int $count, ?string $orientation): array
    {
        $params = [
            'key' => $apiKey,
            'q' => $query,
            'image_type' => 'photo',
            'safesearch' => 'true',
            'per_page' => max(3, $count),
        ];

        $mapped = match ($orientation) {
            'landscape' => 'horizontal',
            'portrait' => 'vertical',
            default => null,
        };
        if ($mapped !== null) {
            $params['orientation'] = $mapped;
        }

        try {
            $response = VisualHttp::make()
                ->get((string) config('visuals.catalogs.pixabay.search_url'), $params);
        } catch (Throwable) {
            return [];
        }

        if (! $response->successful()) {
            return [];
        }

        /** @var list<array<string, mixed>> $rows */
        $rows = $response->json('hits') ?? [];
        $hits = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $src = trim((string) ($row['largeImageURL'] ?? $row['webformatURL'] ?? ''));
            if ($src === '' || ! str_starts_with($src, 'https://')) {
                continue;
            }

            $tags = trim((string) ($row['tags'] ?? $query));
            $credit = trim((string) ($row['user'] ?? 'Pixabay'));
            $href = trim((string) ($row['pageURL'] ?? 'https://pixabay.com'));

            $hits[] = new VisualHit(
                src: $src,
                thumb: trim((string) ($row['previewURL'] ?? $row['webformatURL'] ?? $src)) ?: $src,
                alt: $tags !== '' ? $tags : $query,
                credit: $credit !== '' ? $credit : 'Pixabay',
                href: str_starts_with($href, 'https://') ? $href : 'https://pixabay.com',
                catalog: self::ID,
                width: isset($row['imageWidth']) ? (int) $row['imageWidth'] : null,
                height: isset($row['imageHeight']) ? (int) $row['imageHeight'] : null,
            );
        }

        return $hits;
    }
}
