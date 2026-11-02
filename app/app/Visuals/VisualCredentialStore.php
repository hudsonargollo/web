<?php

namespace App\Visuals;

use App\Models\AiProviderCredential;
use Illuminate\Support\Facades\Schema;

/**
 * Workspace keys for stock catalogs. Same encrypted table as AI providers;
 * env fallback lives in config/visuals.php, not config/ai.php.
 */
final class VisualCredentialStore
{
    public function __construct(private readonly VisualCatalog $catalog) {}

    public function apiKey(string $catalogId): string
    {
        if ($this->tablesReady()) {
            $row = AiProviderCredential::query()->where('provider', $catalogId)->first();
            if ($row && $row->enabled && filled($row->api_key)) {
                return (string) $row->api_key;
            }
        }

        return $this->envApiKey($catalogId);
    }

    public function hasStoredKey(string $catalogId): bool
    {
        if (! $this->tablesReady()) {
            return false;
        }

        $row = AiProviderCredential::query()->where('provider', $catalogId)->first();

        return (bool) ($row && filled($row->api_key));
    }

    public function hasUnreadableStoredKey(string $catalogId): bool
    {
        if (! $this->tablesReady()) {
            return false;
        }

        $row = AiProviderCredential::query()->where('provider', $catalogId)->first();

        return ($row?->cipherIsUnreadable('api_key') ?? false)
            || ($row?->cipherIsUnreadable('api_secret') ?? false);
    }

    public function applicationId(string $catalogId): string
    {
        if ($this->tablesReady()) {
            $row = AiProviderCredential::query()->where('provider', $catalogId)->first();
            if ($row && filled($row->application_id)) {
                return (string) $row->application_id;
            }
        }

        return trim((string) config("visuals.catalogs.{$catalogId}.application_id", ''));
    }

    public function apiSecret(string $catalogId): string
    {
        if ($this->tablesReady()) {
            $row = AiProviderCredential::query()->where('provider', $catalogId)->first();
            if ($row && $row->enabled && filled($row->api_secret)) {
                return (string) $row->api_secret;
            }
        }

        return trim((string) config("visuals.catalogs.{$catalogId}.api_secret", ''));
    }

    public function hasStoredSecret(string $catalogId): bool
    {
        if (! $this->tablesReady()) {
            return false;
        }

        $row = AiProviderCredential::query()->where('provider', $catalogId)->first();

        return (bool) ($row && filled($row->api_secret));
    }

    public function maskedSecret(string $catalogId): ?string
    {
        $secret = $this->apiSecret($catalogId);
        if ($secret === '') {
            return null;
        }

        return '••••••••'.substr($secret, -4);
    }

    public function isEnabled(string $catalogId): bool
    {
        if (! $this->tablesReady()) {
            return true;
        }

        $row = AiProviderCredential::query()->where('provider', $catalogId)->first();

        return $row ? (bool) $row->enabled : true;
    }

    public function isReady(string $catalogId): bool
    {
        return $this->isEnabled($catalogId) && $this->apiKey($catalogId) !== '';
    }

    /**
     * @return 'workspace'|'env'|'missing'
     */
    public function keySource(string $catalogId): string
    {
        if ($this->hasStoredKey($catalogId) && $this->isEnabled($catalogId)) {
            return 'workspace';
        }

        if ($this->envApiKey($catalogId) !== '') {
            return 'env';
        }

        return 'missing';
    }

    public function envApiKey(string $catalogId): string
    {
        return trim((string) config("visuals.catalogs.{$catalogId}.api_key", ''));
    }

    public function maskedKey(string $catalogId): ?string
    {
        $key = $this->apiKey($catalogId);
        if ($key === '') {
            return null;
        }

        return '••••••••'.substr($key, -4);
    }

    /**
     * @param  array{
     *     application_id?: string|null,
     *     api_key?: string|null,
     *     api_secret?: string|null,
     *     enabled?: bool,
     *     clear?: bool,
     *     clear_secret?: bool,
     *     clear_application_id?: bool
     * }  $data
     */
    public function save(string $catalogId, array $data): void
    {
        if (! $this->catalog->has($catalogId)) {
            return;
        }

        $row = AiProviderCredential::query()->firstOrNew(['provider' => $catalogId]);
        $row->enabled = (bool) ($data['enabled'] ?? $row->enabled ?? true);

        if (! empty($data['clear_application_id'])) {
            $row->application_id = null;
        } elseif (array_key_exists('application_id', $data) && filled($data['application_id'])) {
            $row->application_id = trim((string) $data['application_id']);
        }

        if (! empty($data['clear'])) {
            $row->api_key = null;
        } elseif (filled($data['api_key'] ?? null)) {
            $row->api_key = trim((string) $data['api_key']);
        }

        if (! empty($data['clear_secret'])) {
            $row->api_secret = null;
        } elseif (filled($data['api_secret'] ?? null)) {
            $row->api_secret = trim((string) $data['api_secret']);
        }

        $row->save();
    }

    private function tablesReady(): bool
    {
        return Schema::hasTable('ai_provider_credentials');
    }
}
