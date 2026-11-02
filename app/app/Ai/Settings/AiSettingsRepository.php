<?php

namespace App\Ai\Settings;

use App\Models\AiProviderCredential;
use App\Models\AiWorkspaceSetting;
use Illuminate\Support\Facades\Schema;

/**
 * Workspace AI settings. DB values override env/config when present.
 */
final class AiSettingsRepository
{
    private bool $tablesReady;

    public function __construct()
    {
        $this->tablesReady = Schema::hasTable('ai_workspace_settings')
            && Schema::hasTable('ai_provider_credentials');
    }

    public function defaultModelId(): string
    {
        if ($this->tablesReady) {
            $stored = AiWorkspaceSetting::current()->default_model;
            if (is_string($stored) && $stored !== '') {
                return $stored;
            }
        }

        return (string) config('ai.default_model', '');
    }

    public function setDefaultModelId(string $modelId): void
    {
        AiWorkspaceSetting::current()->update(['default_model' => $modelId]);
    }

    public function apiKey(string $provider): string
    {
        if ($this->tablesReady) {
            $row = AiProviderCredential::query()->where('provider', $provider)->first();
            if ($row && $row->enabled && filled($row->api_key)) {
                return (string) $row->api_key;
            }
        }

        return $this->envApiKey($provider);
    }

    public function hasStoredKey(string $provider): bool
    {
        if (! $this->tablesReady) {
            return false;
        }

        $row = AiProviderCredential::query()->where('provider', $provider)->first();

        return (bool) ($row && filled($row->api_key));
    }

    public function hasUnreadableStoredKey(string $provider): bool
    {
        if (! $this->tablesReady) {
            return false;
        }

        $row = AiProviderCredential::query()->where('provider', $provider)->first();

        return $row?->cipherIsUnreadable('api_key') ?? false;
    }

    public function isEnabled(string $provider): bool
    {
        if (! $this->tablesReady) {
            return true;
        }

        $row = AiProviderCredential::query()->where('provider', $provider)->first();

        return $row ? (bool) $row->enabled : true;
    }

    public function keySource(string $provider): string
    {
        if ($this->hasStoredKey($provider) && $this->isEnabled($provider)) {
            return 'workspace';
        }

        if ($this->envApiKey($provider) !== '') {
            return 'env';
        }

        return 'missing';
    }

    /**
     * Env / config fallback when no enabled workspace key is stored.
     */
    public function envApiKey(string $provider): string
    {
        return trim((string) config("ai.providers.{$provider}.api_key", ''));
    }

    public function maskedKey(string $provider): ?string
    {
        $key = $this->apiKey($provider);
        if ($key === '') {
            return null;
        }

        $tail = substr($key, -4);

        return '••••••••'.$tail;
    }

    /**
     * @param  array<string, array{api_key?: string|null, enabled?: bool, clear?: bool}>  $rows
     */
    public function saveProviderCredentials(array $rows): void
    {
        foreach ($rows as $provider => $data) {
            $row = AiProviderCredential::query()->firstOrNew(['provider' => $provider]);
            $row->enabled = (bool) ($data['enabled'] ?? $row->enabled ?? true);

            if (! empty($data['clear'])) {
                $row->api_key = null;
            } elseif (filled($data['api_key'] ?? null)) {
                $row->api_key = trim((string) $data['api_key']);
            }

            $row->save();
        }
    }

    /**
     * Provider configs with workspace keys merged over env defaults.
     *
     * @return array<string, array<string, mixed>>
     */
    public function resolvedProviders(): array
    {
        /** @var array<string, array<string, mixed>> $providers */
        $providers = config('ai.providers', []);

        foreach ($providers as $name => $config) {
            $key = $this->apiKey((string) $name);
            $providers[$name]['api_key'] = $this->isEnabled((string) $name) ? $key : '';
        }

        return $providers;
    }
}
