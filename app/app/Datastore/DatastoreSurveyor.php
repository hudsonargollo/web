<?php

namespace App\Datastore;

use App\Datastore\Lenses\SupabaseLens;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Reports whether the workspace data plane is ready and what tables it exposes.
 * Never includes steward or console tokens in the payload.
 */
final class DatastoreSurveyor
{
    public function __construct(
        private readonly SupabaseLinkBroker $broker,
        private readonly SupabaseLens $supabase,
    ) {}

    /**
     * @return array{
     *     ready: bool,
     *     kind: string,
     *     status: 'ready'|'missing'|'unreachable',
     *     host: string,
     *     project_ref: string,
     *     can_revise: bool,
     *     oauth_ready: bool,
     *     linked: bool,
     *     client_env: array<string, string>,
     *     suggested_files: list<array{path: string, purpose: string}>,
     *     tables: list<array{name: string, columns: list<array{name: string, type: string, nullable: bool}>}>,
     *     message: string
     * }
     */
    public function survey(string $kind = DatastoreKind::SUPABASE, bool $fresh = false, ?User $user = null): array
    {
        $link = $user !== null
            ? $this->broker->statusFor($user)
            : ['oauth_ready' => $this->broker->isOauthReady(), 'linked' => false];
        $plane = $this->broker->planeFor($user);

        if (! $plane['ready']) {
            $oauthReady = (bool) ($link['oauth_ready'] ?? false);

            return $this->empty(
                kind: $kind,
                status: 'missing',
                message: $oauthReady
                    ? 'No data plane is attached. Lab is waiting for Supabase OAuth, then a project.'
                    : 'Supabase OAuth is not configured. An admin must add the OAuth app under Dashboard → API Integration → Supabase.',
                canRevise: false,
                oauthReady: $oauthReady,
                linked: (bool) ($link['linked'] ?? false),
            );
        }

        $ttl = max(0, (int) config('datastore.schema_cache_seconds', 45));
        $cacheKey = 'datastore:survey:'.hash('sha256', $kind.'|'.$plane['host_url'].'|'.substr($plane['steward_token'] ?: $plane['publishable_token'], 0, 12));

        $shape = (! $fresh && $ttl > 0)
            ? Cache::remember($cacheKey, $ttl, fn () => $this->supabase->survey($plane))
            : $this->supabase->survey($plane);

        if ($fresh && $ttl > 0) {
            Cache::put($cacheKey, $shape, $ttl);
        }

        if (! ($shape['ok'] ?? false)) {
            return $this->empty(
                kind: $kind,
                status: 'unreachable',
                message: (string) ($shape['error'] ?? 'Data plane survey failed.'),
                canRevise: (bool) $plane['can_revise'],
                host: $plane['host_url'],
                ref: $plane['project_ref'],
                env: $this->clientEnv($plane),
                oauthReady: true,
                linked: true,
            );
        }

        /** @var list<array{name: string, columns: list<array{name: string, type: string, nullable: bool}>}> $tables */
        $tables = is_array($shape['tables'] ?? null) ? $shape['tables'] : [];
        $count = count($tables);
        $reviseHint = $plane['can_revise']
            ? 'Schema revisions can be applied with revise_datastore.'
            : 'Preview auth is ready. Reconnect Supabase from the Lab + menu to apply SQL.';

        return [
            'ready' => true,
            'kind' => $kind,
            'status' => 'ready',
            'host' => $plane['host_url'],
            'project_ref' => $plane['project_ref'],
            'can_revise' => (bool) $plane['can_revise'],
            'oauth_ready' => true,
            'linked' => true,
            'client_env' => $this->clientEnv($plane),
            'suggested_files' => $this->suggestedFiles(),
            'tables' => $tables,
            'message' => $count === 0
                ? 'Connected. No public tables yet. '.$reviseHint
                : 'Connected. '.$count.' public table'.($count === 1 ? '' : 's').'. '.$reviseHint,
        ];
    }

    /**
     * @param  array{host_url: string, publishable_token: string}  $plane
     * @return array<string, string>
     */
    private function clientEnv(array $plane): array
    {
        return [
            'VITE_SUPABASE_URL' => $plane['host_url'],
            'VITE_SUPABASE_ANON_KEY' => $plane['publishable_token'],
        ];
    }

    /**
     * @return list<array{path: string, purpose: string}>
     */
    private function suggestedFiles(): array
    {
        return [
            ['path' => '.env', 'purpose' => 'Preview env — URL and publishable key only'],
            ['path' => 'src/lib/dataClient.js', 'purpose' => 'Browser client singleton (@supabase/supabase-js)'],
        ];
    }

    /**
     * @param  array<string, string>  $env
     * @return array{
     *     ready: bool,
     *     kind: string,
     *     status: 'ready'|'missing'|'unreachable',
     *     host: string,
     *     project_ref: string,
     *     can_revise: bool,
     *     client_env: array<string, string>,
     *     suggested_files: list<array{path: string, purpose: string}>,
     *     tables: list<array{name: string, columns: list<array{name: string, type: string, nullable: bool}>}>,
     *     message: string
     * }
     */
    private function empty(
        string $kind,
        string $status,
        string $message,
        bool $canRevise,
        string $host = '',
        string $ref = '',
        array $env = [],
        bool $oauthReady = false,
        bool $linked = false,
    ): array {
        return [
            'ready' => false,
            'kind' => $kind,
            'status' => $status,
            'host' => $host,
            'project_ref' => $ref,
            'can_revise' => $canRevise,
            'oauth_ready' => $oauthReady,
            'linked' => $linked,
            'client_env' => $env,
            'suggested_files' => $this->suggestedFiles(),
            'tables' => [],
            'message' => $message,
        ];
    }
}
