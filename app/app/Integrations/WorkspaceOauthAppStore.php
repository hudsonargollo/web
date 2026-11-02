<?php

namespace App\Integrations;

use App\Lab\Github\LabGithubImportLimits;
use App\Models\WorkspaceOauthApp;
use Illuminate\Support\Facades\Schema;

/**
 * Workspace-level OAuth application credentials (Client ID / Secret).
 * DB values override env when an enabled row exists.
 */
final class WorkspaceOauthAppStore
{
    public const DRIVER_GITHUB = 'github';

    public const DRIVER_SUPABASE = 'supabase';

    private bool $tableReady;

    public function __construct()
    {
        $this->tableReady = Schema::hasTable('workspace_oauth_apps');
    }

    /**
     * @return array{
     *     driver: string,
     *     client_id: string,
     *     client_secret: string,
     *     enabled: bool,
     *     source: 'workspace'|'env'|'missing',
     *     ready: bool,
     *     settings: array<string, mixed>
     * }
     */
    public function get(string $driver): array
    {
        $envId = $this->envClientId($driver);
        $envSecret = $this->envClientSecret($driver);
        $settings = [];

        if ($this->tableReady) {
            $row = WorkspaceOauthApp::query()->where('driver', $driver)->first();
            if ($row !== null) {
                $clientId = filled($row->client_id) ? (string) $row->client_id : $envId;
                $clientSecret = filled($row->client_secret) ? (string) $row->client_secret : $envSecret;
                $enabled = (bool) $row->enabled;
                $source = filled($row->client_id) && filled($row->client_secret)
                    ? 'workspace'
                    : ((filled($envId) && filled($envSecret)) ? 'env' : 'missing');
                $settings = is_array($row->settings) ? $row->settings : [];

                return [
                    'driver' => $driver,
                    'client_id' => $enabled ? $clientId : '',
                    'client_secret' => $enabled ? $clientSecret : '',
                    'enabled' => $enabled,
                    'source' => $enabled && ($clientId !== '' && $clientSecret !== '') ? $source : ($enabled ? $source : 'missing'),
                    'ready' => $enabled && $clientId !== '' && $clientSecret !== '',
                    'settings' => $settings,
                ];
            }
        }

        $ready = $envId !== '' && $envSecret !== '';

        return [
            'driver' => $driver,
            'client_id' => $envId,
            'client_secret' => $envSecret,
            'enabled' => true,
            'source' => $ready ? 'env' : 'missing',
            'ready' => $ready,
            'settings' => $settings,
        ];
    }

    public function isReady(string $driver): bool
    {
        return $this->get($driver)['ready'];
    }

    public function setting(string $driver, string $key, mixed $default = null): mixed
    {
        $settings = $this->get($driver)['settings'] ?? [];

        return is_array($settings) && array_key_exists($key, $settings)
            ? $settings[$key]
            : $default;
    }

    /**
     * @param  array{
     *     client_id?: string|null,
     *     client_secret?: string|null,
     *     enabled?: bool,
     *     clear_secret?: bool,
     *     settings?: array<string, mixed>
     * }  $data
     */
    public function save(string $driver, array $data): void
    {
        $row = WorkspaceOauthApp::query()->firstOrNew(['driver' => $driver]);
        $row->enabled = (bool) ($data['enabled'] ?? $row->enabled ?? true);

        if (array_key_exists('client_id', $data) && filled($data['client_id'])) {
            $row->client_id = trim((string) $data['client_id']);
        }

        if (! empty($data['clear_secret'])) {
            $row->client_secret = null;
        } elseif (filled($data['client_secret'] ?? null)) {
            $row->client_secret = trim((string) $data['client_secret']);
        }

        if (array_key_exists('settings', $data) && is_array($data['settings'])) {
            $current = is_array($row->settings) ? $row->settings : [];
            $row->settings = array_merge($current, $data['settings']);
        }

        $row->save();
    }

    public function maskedSecret(string $driver): ?string
    {
        $app = $this->get($driver);
        $secret = $app['client_secret'];
        if ($secret === '') {
            return null;
        }

        return '••••••••'.substr($secret, -4);
    }

    public function hasStoredSecret(string $driver): bool
    {
        if (! $this->tableReady) {
            return false;
        }

        $row = WorkspaceOauthApp::query()->where('driver', $driver)->first();

        return (bool) ($row && filled($row->client_secret));
    }

    public function hasUnreadableStoredSecret(string $driver): bool
    {
        if (! $this->tableReady) {
            return false;
        }

        $row = WorkspaceOauthApp::query()->where('driver', $driver)->first();

        return $row?->cipherIsUnreadable('client_secret') ?? false;
    }

    public function hasStoredClientId(string $driver): bool
    {
        if (! $this->tableReady) {
            return false;
        }

        $row = WorkspaceOauthApp::query()->where('driver', $driver)->first();

        return (bool) ($row && filled($row->client_id));
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    public function normalizeGithubSettings(array $settings): array
    {
        $out = [];

        if (array_key_exists('max_zip_mb', $settings)) {
            $out['max_zip_mb'] = LabGithubImportLimits::clampMb((int) $settings['max_zip_mb']);
        }

        if (array_key_exists('max_files', $settings)) {
            $out['max_files'] = LabGithubImportLimits::clampFiles((int) $settings['max_files']);
        }

        return $out;
    }

    public function redirectOverride(string $driver): string
    {
        return trim((string) $this->setting($driver, 'redirect_uri', ''));
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    public function normalizeSupabaseSettings(array $settings): array
    {
        $out = [];

        if (array_key_exists('redirect_uri', $settings)) {
            $uri = trim((string) $settings['redirect_uri']);
            $out['redirect_uri'] = $uri !== ''
                && filter_var($uri, FILTER_VALIDATE_URL)
                && str_starts_with(strtolower($uri), 'https://')
                ? $uri
                : '';
        }

        return $out;
    }

    private function envClientId(string $driver): string
    {
        return match ($driver) {
            self::DRIVER_GITHUB => trim((string) config('services.github.oauth.client_id', '')),
            self::DRIVER_SUPABASE => trim((string) config('services.supabase.oauth.client_id', '')),
            default => '',
        };
    }

    private function envClientSecret(string $driver): string
    {
        return match ($driver) {
            self::DRIVER_GITHUB => trim((string) config('services.github.oauth.client_secret', '')),
            self::DRIVER_SUPABASE => trim((string) config('services.supabase.oauth.client_secret', '')),
            default => '',
        };
    }
}
