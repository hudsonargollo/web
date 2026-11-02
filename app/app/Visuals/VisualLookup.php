<?php

namespace App\Visuals;

use App\Visuals\Lenses\PixabayLens;
use App\Visuals\Lenses\UnsplashLens;
use Illuminate\Support\Facades\Cache;

/**
 * Fan-out a scene query across enabled catalogs and return hotlinkable hits.
 */
final class VisualLookup
{
    public function __construct(
        private readonly VisualCredentialStore $credentials,
        private readonly UnsplashLens $unsplash,
        private readonly PixabayLens $pixabay,
    ) {}

    /**
     * @return array{
     *     query: string,
     *     visuals: list<array<string, mixed>>,
     *     catalogs: array{unsplash: bool, pixabay: bool}
     * }
     */
    public function find(string $query, int $count = 4, ?string $orientation = null): array
    {
        $query = $this->normalizeQuery($query);
        $count = max(1, min($count, (int) config('visuals.max_per_query', 8)));
        $orientation = $this->normalizeOrientation($orientation);

        $ready = [
            'unsplash' => $this->credentials->isReady(UnsplashLens::ID),
            'pixabay' => $this->credentials->isReady(PixabayLens::ID),
        ];

        if ($query === '' || ($ready['unsplash'] === false && $ready['pixabay'] === false)) {
            return [
                'query' => $query,
                'visuals' => [],
                'catalogs' => $ready,
            ];
        }

        $ttl = max(0, (int) config('visuals.cache_seconds', 600));
        $cacheKey = 'visuals:lookup:'.hash('sha256', $query.'|'.$count.'|'.($orientation ?? '').'|'.(int) $ready['unsplash'].'|'.(int) $ready['pixabay']);

        $hits = $ttl > 0
            ? Cache::remember($cacheKey, $ttl, fn () => $this->collect($query, $count, $orientation, $ready))
            : $this->collect($query, $count, $orientation, $ready);

        return [
            'query' => $query,
            'visuals' => array_map(static fn (VisualHit $hit) => $hit->toArray(), $hits),
            'catalogs' => $ready,
        ];
    }

    /**
     * @param  array{unsplash: bool, pixabay: bool}  $ready
     * @return list<VisualHit>
     */
    private function collect(string $query, int $count, ?string $orientation, array $ready): array
    {
        $pools = [];

        if ($ready['unsplash']) {
            $pools[] = $this->unsplash->search(
                $this->credentials->apiKey(UnsplashLens::ID),
                $query,
                $count,
                $orientation,
            );
        }

        if ($ready['pixabay']) {
            $pools[] = $this->pixabay->search(
                $this->credentials->apiKey(PixabayLens::ID),
                $query,
                $count,
                $orientation,
            );
        }

        return $this->interleave($pools, $count);
    }

    /**
     * @param  list<list<VisualHit>>  $pools
     * @return list<VisualHit>
     */
    private function interleave(array $pools, int $count): array
    {
        $out = [];
        $seen = [];
        $index = 0;

        while (count($out) < $count) {
            $progress = false;
            foreach ($pools as $pool) {
                if (! isset($pool[$index])) {
                    continue;
                }
                $progress = true;
                $hit = $pool[$index];
                if (isset($seen[$hit->src])) {
                    continue;
                }
                $seen[$hit->src] = true;
                $out[] = $hit;
                if (count($out) >= $count) {
                    break;
                }
            }
            if (! $progress) {
                break;
            }
            $index++;
        }

        return $out;
    }

    private function normalizeQuery(string $query): string
    {
        $query = trim(preg_replace('/\s+/u', ' ', $query) ?? '');
        $query = trim($query, " \t\n\r\0\x0B\"'");

        if ($query === '') {
            return '';
        }

        return mb_substr($query, 0, 80);
    }

    private function normalizeOrientation(?string $orientation): ?string
    {
        $orientation = strtolower(trim((string) $orientation));

        return in_array($orientation, ['landscape', 'portrait', 'square'], true)
            ? $orientation
            : null;
    }
}
