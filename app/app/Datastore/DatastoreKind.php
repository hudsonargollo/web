<?php

namespace App\Datastore;

/**
 * Known Lab data-plane backends. Not AI providers — no models, no cost estimator.
 */
final class DatastoreKind
{
    public const SUPABASE = 'supabase';

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
        /** @var array<string, array<string, mixed>> $kinds */
        $kinds = config('datastore.kinds', []);

        return $kinds;
    }
}
