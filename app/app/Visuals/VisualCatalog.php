<?php

namespace App\Visuals;

/**
 * Registry of stock photograph catalogs (Unsplash, Pixabay).
 * Not AI providers — they have no models and no cost estimator.
 */
final class VisualCatalog
{
    /**
     * @return list<string>
     */
    public function ids(): array
    {
        return array_keys($this->all());
    }

    public function has(string $id): bool
    {
        return array_key_exists($id, $this->all());
    }

    public function label(string $id): string
    {
        $row = $this->all()[$id] ?? null;

        return is_array($row) ? (string) ($row['label'] ?? $id) : $id;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function all(): array
    {
        /** @var array<string, array<string, mixed>> $catalogs */
        $catalogs = config('visuals.catalogs', []);

        return $catalogs;
    }
}
