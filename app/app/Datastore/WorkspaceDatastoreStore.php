<?php

namespace App\Datastore;

use App\Models\WorkspaceDatastore;
use Illuminate\Support\Facades\Schema;

/**
 * Workspace-level data-plane credentials. DB values override env when an
 * enabled row exists. Steward / console tokens never leave this store.
 */
final class WorkspaceDatastoreStore
{
    public function __construct(private readonly DatastoreKind $kinds) {}

    /**
     * @return array{
     *     kind: string,
     *     host_url: string,
     *     publishable_token: string,
     *     steward_token: string,
     *     console_token: string,
     *     project_ref: string,
     *     enabled: bool,
     *     source: 'workspace'|'env'|'missing',
     *     ready: bool,
     *     can_revise: bool,
     *     settings: array<string, mixed>
     * }
     */
    public function get(string $kind): array
    {
        $env = $this->envSlice($kind);
        $settings = [];

        if ($this->tablesReady()) {
            $row = WorkspaceDatastore::query()->where('kind', $kind)->first();
            if ($row !== null) {
                $host = filled($row->host_url) ? rtrim((string) $row->host_url, '/') : $env['host_url'];
                $publishable = filled($row->publishable_token) ? (string) $row->publishable_token : $env['publishable_token'];
                $steward = filled($row->steward_token) ? (string) $row->steward_token : $env['steward_token'];
                $console = filled($row->console_token) ? (string) $row->console_token : $env['console_token'];
                $enabled = (bool) $row->enabled;
                $settings = is_array($row->settings) ? $row->settings : [];
                $source = filled($row->host_url) && filled($row->publishable_token)
                    ? 'workspace'
                    : ((filled($env['host_url']) && filled($env['publishable_token'])) ? 'env' : 'missing');
                $ref = $this->projectRef($host);

                return [
                    'kind' => $kind,
                    'host_url' => $enabled ? $host : '',
                    'publishable_token' => $enabled ? $publishable : '',
                    'steward_token' => $enabled ? $steward : '',
                    'console_token' => $enabled ? $console : '',
                    'project_ref' => $ref,
                    'enabled' => $enabled,
                    'source' => $enabled && $host !== '' && $publishable !== ''
                        ? $source
                        : ($enabled ? $source : 'missing'),
                    'ready' => $enabled && $host !== '' && $publishable !== '',
                    'can_revise' => $enabled && $console !== '' && $ref !== '',
                    'settings' => $settings,
                ];
            }
        }

        $host = $env['host_url'];
        $publishable = $env['publishable_token'];
        $ready = $host !== '' && $publishable !== '';
        $ref = $this->projectRef($host);

        return [
            'kind' => $kind,
            'host_url' => $host,
            'publishable_token' => $publishable,
            'steward_token' => $env['steward_token'],
            'console_token' => $env['console_token'],
            'project_ref' => $ref,
            'enabled' => true,
            'source' => $ready ? 'env' : 'missing',
            'ready' => $ready,
            'can_revise' => $ready && $env['console_token'] !== '' && $ref !== '',
            'settings' => $settings,
        ];
    }

    public function isReady(string $kind): bool
    {
        return $this->get($kind)['ready'];
    }

    public function isEnabled(string $kind): bool
    {
        return $this->get($kind)['enabled'];
    }

    /**
     * @return 'workspace'|'env'|'missing'
     */
    public function keySource(string $kind): string
    {
        return $this->get($kind)['source'];
    }

    public function hasStoredPublishable(string $kind): bool
    {
        if (! $this->tablesReady()) {
            return false;
        }

        $row = WorkspaceDatastore::query()->where('kind', $kind)->first();

        return (bool) ($row && filled($row->publishable_token));
    }

    public function hasStoredSteward(string $kind): bool
    {
        if (! $this->tablesReady()) {
            return false;
        }

        $row = WorkspaceDatastore::query()->where('kind', $kind)->first();

        return (bool) ($row && filled($row->steward_token));
    }

    public function hasStoredConsole(string $kind): bool
    {
        if (! $this->tablesReady()) {
            return false;
        }

        $row = WorkspaceDatastore::query()->where('kind', $kind)->first();

        return (bool) ($row && filled($row->console_token));
    }

    public function maskedPublishable(string $kind): ?string
    {
        $token = $this->get($kind)['publishable_token'];
        if ($token === '') {
            return null;
        }

        return '••••••••'.substr($token, -4);
    }

    /**
     * @param  array{
     *     host_url?: string|null,
     *     publishable_token?: string|null,
     *     steward_token?: string|null,
     *     console_token?: string|null,
     *     enabled?: bool,
     *     clear_publishable?: bool,
     *     clear_steward?: bool,
     *     clear_console?: bool
     * }  $data
     */
    public function save(string $kind, array $data): void
    {
        if (! $this->kinds->has($kind)) {
            return;
        }

        $row = WorkspaceDatastore::query()->firstOrNew(['kind' => $kind]);
        $row->enabled = (bool) ($data['enabled'] ?? $row->enabled ?? true);

        if (array_key_exists('host_url', $data)) {
            $host = trim((string) ($data['host_url'] ?? ''));
            $row->host_url = $host !== '' ? rtrim($host, '/') : $row->host_url;
        }

        if (! empty($data['clear_publishable'])) {
            $row->publishable_token = null;
        } elseif (filled($data['publishable_token'] ?? null)) {
            $row->publishable_token = trim((string) $data['publishable_token']);
        }

        if (! empty($data['clear_steward'])) {
            $row->steward_token = null;
        } elseif (filled($data['steward_token'] ?? null)) {
            $row->steward_token = trim((string) $data['steward_token']);
        }

        if (! empty($data['clear_console'])) {
            $row->console_token = null;
        } elseif (filled($data['console_token'] ?? null)) {
            $row->console_token = trim((string) $data['console_token']);
        }

        $row->save();
    }

    public function forget(string $kind): void
    {
        if (! $this->tablesReady()) {
            return;
        }

        WorkspaceDatastore::query()->where('kind', $kind)->delete();
    }

    public function projectRef(string $hostUrl): string
    {
        $host = strtolower((string) parse_url($hostUrl, PHP_URL_HOST));
        if ($host === '' || ! str_ends_with($host, '.supabase.co')) {
            return '';
        }

        $label = explode('.', $host)[0] ?? '';

        return preg_match('/^[a-z0-9]{8,}$/', $label) === 1 ? $label : '';
    }

    /**
     * @return array{host_url: string, publishable_token: string, steward_token: string, console_token: string}
     */
    private function envSlice(string $kind): array
    {
        $row = $this->kinds->all()[$kind] ?? [];

        return [
            'host_url' => rtrim(trim((string) ($row['host_url'] ?? '')), '/'),
            'publishable_token' => trim((string) ($row['publishable_token'] ?? '')),
            'steward_token' => trim((string) ($row['steward_token'] ?? '')),
            'console_token' => trim((string) ($row['console_token'] ?? '')),
        ];
    }

    private function tablesReady(): bool
    {
        return Schema::hasTable('workspace_datastores');
    }
}
