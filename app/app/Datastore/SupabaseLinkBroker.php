<?php

namespace App\Datastore;

use App\Integrations\WorkspaceOauthAppStore;
use App\Models\User;
use App\Models\UserDatastoreLink;
use App\Support\DevTunnel;
use App\Support\Http\LocalReturnPath;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

/**
 * Per-user Supabase Management OAuth. Workspace stores only the OAuth app.
 */
final class SupabaseLinkBroker
{
    public const SESSION_STATE = 'lab.oauth.supabase.state';

    public const SESSION_VERIFIER = 'lab.oauth.supabase.verifier';

    public const SESSION_RETURN = 'lab.oauth.supabase.return';

    public const SESSION_POPUP = 'lab.oauth.supabase.popup';

    public const PENDING_PREFIX = 'lab.oauth.supabase.pending.';

    public const PENDING_TTL_SECONDS = 600;

    public function __construct(
        private readonly WorkspaceOauthAppStore $apps = new WorkspaceOauthAppStore,
    ) {}

    public function callbackUrl(): string
    {
        foreach ([
            $this->apps->redirectOverride(WorkspaceOauthAppStore::DRIVER_SUPABASE),
            trim((string) config('services.supabase.oauth.redirect', '')),
            $this->liveTunnelCallback(),
            $this->rememberedTunnelCallback(),
            route('lab.oauth.supabase.return'),
        ] as $url) {
            $url = trim((string) $url);
            if ($url !== '' && DevTunnel::isHttpsUrl($url)) {
                return $url;
            }
        }

        return route('lab.oauth.supabase.return');
    }

    public function isOauthReady(): bool
    {
        return $this->apps->isReady(WorkspaceOauthAppStore::DRIVER_SUPABASE);
    }

    public function linkFor(User $user): ?UserDatastoreLink
    {
        return UserDatastoreLink::query()
            ->where('user_id', $user->id)
            ->where('driver', UserDatastoreLink::DRIVER_SUPABASE)
            ->first();
    }

    /**
     * @return array{
     *     oauth_ready: bool,
     *     linked: bool,
     *     ready: bool,
     *     can_revise: bool,
     *     host: string,
     *     project_ref: string,
     *     project_name: string,
     *     login: string
     * }
     */
    public function statusFor(User $user): array
    {
        $link = $this->linkFor($user);
        $attached = $link !== null && filled($link->host_url) && filled($link->publishable_token);

        return [
            'oauth_ready' => $this->isOauthReady(),
            'linked' => $link !== null && filled($link->access_token),
            'ready' => $attached,
            'can_revise' => $attached && filled($link?->access_token),
            'host' => $attached ? (string) $link->host_url : '',
            'project_ref' => $attached ? (string) $link->project_ref : '',
            'project_name' => $attached ? (string) $link->project_name : '',
            'login' => $link?->login ? (string) $link->login : '',
        ];
    }

    /**
     * @return array{url: string, state: string}
     */
    public function begin(User $user, ?string $returnPath = null, bool $popup = false): array
    {
        if (! $this->isOauthReady()) {
            throw new RuntimeException(__('dashboard.Supabase OAuth is not configured.'));
        }

        if (! DevTunnel::isHttpsUrl($this->callbackUrl())) {
            throw new RuntimeException(__('dashboard.Supabase requires an HTTPS callback URL. Set the redirect override to your tunnel URL.'));
        }

        $app = $this->apps->get(WorkspaceOauthAppStore::DRIVER_SUPABASE);
        $state = Str::random(40);
        $verifier = Str::random(64);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        $return = $this->sanitizeReturnPath($returnPath) ?? '/lab';
        $pending = [
            'user_id' => $user->id,
            'verifier' => $verifier,
            'return' => $return,
            'popup' => $popup,
        ];

        session([
            self::SESSION_STATE => $state,
            self::SESSION_VERIFIER => $verifier,
            self::SESSION_RETURN => $return,
            self::SESSION_POPUP => $popup,
        ]);
        Cache::put(self::PENDING_PREFIX.$state, $pending, self::PENDING_TTL_SECONDS);

        $query = http_build_query([
            'client_id' => $app['client_id'],
            'redirect_uri' => $this->callbackUrl(),
            'response_type' => 'code',
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
        ]);

        $base = rtrim((string) config('services.supabase.api_url', 'https://api.supabase.com'), '/');

        return [
            'url' => $base.'/v1/oauth/authorize?'.$query,
            'state' => $state,
        ];
    }

    /**
     * @return array{user_id: int|null, verifier: string, return: string, popup: bool}|null
     */
    public function handshake(string $state): ?array
    {
        if ($state === '') {
            return null;
        }

        $cached = Cache::get(self::PENDING_PREFIX.$state);
        if (is_array($cached) && filled($cached['verifier'] ?? null)) {
            return $this->normalizeHandshake($cached);
        }

        $expected = (string) session(self::SESSION_STATE, '');
        if ($expected === '' || ! hash_equals($expected, $state)) {
            return null;
        }

        return $this->normalizeHandshake([
            'verifier' => (string) session(self::SESSION_VERIFIER, ''),
            'return' => session(self::SESSION_RETURN, '/lab'),
            'popup' => session(self::SESSION_POPUP, false),
        ]);
    }

    public function forgetHandshake(string $state): void
    {
        if ($state !== '') {
            Cache::forget(self::PENDING_PREFIX.$state);
        }

        session()->forget([
            self::SESSION_STATE,
            self::SESSION_VERIFIER,
            self::SESSION_RETURN,
            self::SESSION_POPUP,
        ]);
    }

    public function complete(User $user, string $code, string $state): UserDatastoreLink
    {
        $pending = $this->handshake($state);
        $this->forgetHandshake($state);

        $verifier = is_array($pending) ? (string) ($pending['verifier'] ?? '') : '';
        if ($pending === null || $verifier === '') {
            throw new InvalidArgumentException(__('dashboard.Supabase authorization state was invalid.'));
        }

        if ($pending['user_id'] !== null && (int) $pending['user_id'] !== (int) $user->id) {
            throw new InvalidArgumentException(__('dashboard.Supabase authorization state was invalid.'));
        }

        if (! $this->isOauthReady()) {
            throw new RuntimeException(__('dashboard.Supabase OAuth is not configured.'));
        }

        $tokens = $this->exchangeCode($code, $verifier);
        $orgs = $this->fetchOrganizations($tokens['access_token']);
        $first = $orgs[0] ?? [];

        $link = UserDatastoreLink::query()->firstOrNew([
            'user_id' => $user->id,
            'driver' => UserDatastoreLink::DRIVER_SUPABASE,
        ]);

        $link->fill([
            'external_id' => (string) ($first['id'] ?? $link->external_id ?? ''),
            'login' => (string) ($first['name'] ?? $first['slug'] ?? $link->login ?? 'Supabase'),
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'] ?: $link->refresh_token,
            'token_expires_at' => $tokens['expires_at'],
            'organization_id' => (string) ($first['id'] ?? $link->organization_id ?? ''),
            'linked_at' => now(),
        ]);
        $link->save();

        return $link;
    }

    /**
     * @return list<array{ref: string, name: string, region: string, organization_id: string}>
     */
    public function projectsFor(User $user): array
    {
        $token = $this->tokenFor($user);
        $forbidden = false;
        $byRef = [];

        foreach ($this->mapProjectRows($this->getJson(
            $token,
            $this->supabaseApiUrl('/v1/projects'),
            $forbidden,
        )) as $row) {
            $byRef[$row['ref']] = $row;
        }

        if ($byRef === []) {
            foreach ($this->fetchOrganizations($token) as $org) {
                if (! is_array($org)) {
                    continue;
                }
                $slug = trim((string) ($org['slug'] ?? ''));
                if ($slug === '') {
                    continue;
                }
                $orgId = (string) ($org['id'] ?? '');
                $path = '/v2/organizations/'.rawurlencode($slug).'/projects';
                $url = $this->supabaseApiUrl($path).'?'.http_build_query(['page' => ['size' => 100]]);
                for ($page = 0; $page < 8; $page++) {
                    $payload = $this->getJson($token, $url, $forbidden);
                    foreach ($this->mapProjectRows($payload, $orgId) as $row) {
                        $byRef[$row['ref']] = $row;
                    }
                    $next = is_array($payload) ? ($payload['links']['next'] ?? '') : '';
                    if (! is_string($next) || $next === '') {
                        break;
                    }
                    $url = str_starts_with($next, 'http') ? $next : $this->supabaseApiUrl($next);
                }
            }
        }

        $projects = array_values($byRef);

        if ($projects === [] && $forbidden) {
            throw new RuntimeException(__('dashboard.The Supabase OAuth app needs Organizations and Projects read access.'));
        }

        return $projects;
    }

    /**
     * @return list<array{ref: string, name: string, region: string, organization_id: string}>
     */
    private function mapProjectRows(mixed $payload, string $organizationId = ''): array
    {
        $out = [];
        foreach ($this->unwrapList($payload) as $row) {
            if (! is_array($row)) {
                continue;
            }
            $attrs = is_array($row['attributes'] ?? null) ? $row['attributes'] : [];
            $ref = trim((string) ($row['ref'] ?? $attrs['ref'] ?? ''));
            if ($ref === '') {
                $ref = trim((string) ($row['id'] ?? ''));
            }
            if ($ref === '' || $ref === 'project') {
                continue;
            }
            $out[$ref] = [
                'ref' => $ref,
                'name' => (string) ($row['name'] ?? $attrs['name'] ?? $ref),
                'region' => (string) ($row['region'] ?? $attrs['region'] ?? ''),
                'organization_id' => (string) ($row['organization_id'] ?? $organizationId),
            ];
        }

        return array_values($out);
    }

    /**
     * @return list<mixed>
     */
    private function unwrapList(mixed $payload): array
    {
        if (! is_array($payload)) {
            return [];
        }
        if ($payload === []) {
            return [];
        }
        if (array_is_list($payload)) {
            return $payload;
        }
        foreach (['data', 'projects', 'items'] as $key) {
            if (isset($payload[$key]) && is_array($payload[$key])) {
                return $this->unwrapList($payload[$key]);
            }
        }

        return [];
    }

    private function supabaseApiUrl(string $path): string
    {
        $base = rtrim((string) config('services.supabase.api_url', 'https://api.supabase.com'), '/');
        $path = str_starts_with($path, '/') ? $path : '/'.$path;

        return $base.$path;
    }

    private function getJson(string $token, string $url, bool &$forbidden = false): mixed
    {
        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(20)
                ->get($url);
        } catch (Throwable $e) {
            report($e);

            return null;
        }

        if ($response->status() === 401 || $response->status() === 403) {
            $forbidden = true;

            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        return $response->json();
    }

    public function attachProject(User $user, string $projectRef): UserDatastoreLink
    {
        $link = $this->linkFor($user);
        if ($link === null || ! filled($link->access_token)) {
            throw new RuntimeException(__('dashboard.Connect Supabase from Lab first.'));
        }

        $projects = $this->projectsFor($user);
        $chosen = collect($projects)->firstWhere('ref', $projectRef);
        if (! is_array($chosen)) {
            throw new InvalidArgumentException(__('dashboard.Unknown Supabase project.'));
        }

        $keys = $this->fetchApiKeys($this->tokenFor($user), $projectRef);
        $host = 'https://'.$projectRef.'.supabase.co';

        $link->fill([
            'host_url' => $host,
            'publishable_token' => $keys['publishable'],
            'steward_token' => $keys['steward'],
            'project_ref' => $projectRef,
            'project_name' => $chosen['name'],
            'organization_id' => $chosen['organization_id'] ?: $link->organization_id,
        ]);
        $link->save();

        return $link;
    }

    public function unlink(User $user): void
    {
        UserDatastoreLink::query()
            ->where('user_id', $user->id)
            ->where('driver', UserDatastoreLink::DRIVER_SUPABASE)
            ->delete();
    }

    public function tokenFor(User $user): string
    {
        $link = $this->linkFor($user);
        if ($link === null || ! filled($link->access_token)) {
            throw new RuntimeException(__('dashboard.Connect Supabase from Lab first.'));
        }

        if ($link->token_expires_at && $link->token_expires_at->isPast() && filled($link->refresh_token)) {
            $tokens = $this->refresh($link);
            $link->fill([
                'access_token' => $tokens['access_token'],
                'refresh_token' => $tokens['refresh_token'] ?: $link->refresh_token,
                'token_expires_at' => $tokens['expires_at'],
            ]);
            $link->save();
        }

        return (string) $link->access_token;
    }

    /**
     * Plane used by survey / revise for this user.
     *
     * @return array{
     *     host_url: string,
     *     publishable_token: string,
     *     steward_token: string,
     *     console_token: string,
     *     project_ref: string,
     *     ready: bool,
     *     can_revise: bool
     * }
     */
    public function planeFor(?User $user): array
    {
        if ($user !== null) {
            $link = $this->linkFor($user);
            if ($link && filled($link->host_url) && filled($link->publishable_token)) {
                $token = '';
                try {
                    $token = $this->tokenFor($user);
                } catch (Throwable) {
                    $token = (string) $link->access_token;
                }

                return [
                    'host_url' => (string) $link->host_url,
                    'publishable_token' => (string) $link->publishable_token,
                    'steward_token' => (string) $link->steward_token,
                    'console_token' => $token,
                    'project_ref' => (string) $link->project_ref,
                    'ready' => true,
                    'can_revise' => $token !== '',
                ];
            }
        }

        $workspace = app(WorkspaceDatastoreStore::class)->get(DatastoreKind::SUPABASE);

        return [
            'host_url' => $workspace['host_url'],
            'publishable_token' => $workspace['publishable_token'],
            'steward_token' => $workspace['steward_token'],
            'console_token' => $workspace['console_token'],
            'project_ref' => $workspace['project_ref'],
            'ready' => $workspace['ready'],
            'can_revise' => $workspace['can_revise'],
        ];
    }

    public function consumeReturnPath(): string
    {
        $path = (string) session(self::SESSION_RETURN, '/lab');
        session()->forget(self::SESSION_RETURN);

        return $this->sanitizeReturnPath($path) ?? '/lab';
    }

    public function consumePopup(): bool
    {
        $popup = (bool) session(self::SESSION_POPUP, false);
        session()->forget(self::SESSION_POPUP);

        return $popup;
    }

    /**
     * @param  array<string, mixed>  $pending
     * @return array{user_id: int|null, verifier: string, return: string, popup: bool}
     */
    private function normalizeHandshake(array $pending): array
    {
        $userId = $pending['user_id'] ?? null;

        return [
            'user_id' => is_numeric($userId) ? (int) $userId : null,
            'verifier' => (string) ($pending['verifier'] ?? ''),
            'return' => $this->sanitizeReturnPath((string) ($pending['return'] ?? '/lab')) ?? '/lab',
            'popup' => (bool) ($pending['popup'] ?? false),
        ];
    }

    /**
     * @return array{access_token: string, refresh_token: string, expires_at: Carbon|null}
     */
    private function exchangeCode(string $code, string $verifier): array
    {
        $app = $this->apps->get(WorkspaceOauthAppStore::DRIVER_SUPABASE);
        $base = rtrim((string) config('services.supabase.api_url', 'https://api.supabase.com'), '/');

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->withBasicAuth($app['client_id'], $app['client_secret'])
                ->timeout(30)
                ->post($base.'/v1/oauth/token', [
                    'grant_type' => 'authorization_code',
                    'code' => $code,
                    'redirect_uri' => $this->callbackUrl(),
                    'code_verifier' => $verifier,
                ])
                ->throw();
        } catch (Throwable $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not complete Supabase authorization.'), previous: $e);
        }

        return $this->readTokens($response->json() ?? []);
    }

    /**
     * @return array{access_token: string, refresh_token: string, expires_at: Carbon|null}
     */
    private function refresh(UserDatastoreLink $link): array
    {
        $app = $this->apps->get(WorkspaceOauthAppStore::DRIVER_SUPABASE);
        $base = rtrim((string) config('services.supabase.api_url', 'https://api.supabase.com'), '/');

        try {
            $response = Http::asForm()
                ->acceptJson()
                ->withBasicAuth($app['client_id'], $app['client_secret'])
                ->timeout(30)
                ->post($base.'/v1/oauth/token', [
                    'grant_type' => 'refresh_token',
                    'refresh_token' => (string) $link->refresh_token,
                ])
                ->throw();
        } catch (Throwable $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not refresh the Supabase session.'), previous: $e);
        }

        return $this->readTokens($response->json() ?? []);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{access_token: string, refresh_token: string, expires_at: Carbon|null}
     */
    private function readTokens(array $payload): array
    {
        $access = trim((string) ($payload['access_token'] ?? ''));
        if ($access === '') {
            throw new RuntimeException(__('dashboard.Could not complete Supabase authorization.'));
        }

        $expires = isset($payload['expires_in'])
            ? now()->addSeconds(max(60, (int) $payload['expires_in'] - 30))
            : null;

        return [
            'access_token' => $access,
            'refresh_token' => trim((string) ($payload['refresh_token'] ?? '')),
            'expires_at' => $expires,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fetchOrganizations(string $token): array
    {
        $base = rtrim((string) config('services.supabase.api_url', 'https://api.supabase.com'), '/');

        try {
            $rows = Http::withToken($token)
                ->acceptJson()
                ->timeout(20)
                ->get($base.'/v1/organizations')
                ->throw()
                ->json();
        } catch (Throwable) {
            return [];
        }

        return is_array($rows) ? array_values(array_filter($rows, 'is_array')) : [];
    }

    /**
     * @return array{publishable: string, steward: string}
     */
    private function fetchApiKeys(string $token, string $ref): array
    {
        $base = rtrim((string) config('services.supabase.api_url', 'https://api.supabase.com'), '/');

        try {
            $rows = Http::withToken($token)
                ->acceptJson()
                ->timeout(20)
                ->get($base.'/v1/projects/'.$ref.'/api-keys')
                ->throw()
                ->json();
        } catch (Throwable $e) {
            report($e);

            throw new RuntimeException(__('dashboard.Could not read project API keys.'), previous: $e);
        }

        $publishable = '';
        $steward = '';
        foreach (is_array($rows) ? $rows : [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $name = strtolower((string) ($row['name'] ?? $row['id'] ?? ''));
            $value = (string) ($row['api_key'] ?? $row['key'] ?? '');
            if ($value === '') {
                continue;
            }
            if (in_array($name, ['anon', 'publishable'], true)) {
                $publishable = $value;
            }
            if (in_array($name, ['service_role', 'secret', 'steward'], true)) {
                $steward = $value;
            }
        }

        if ($publishable === '') {
            throw new RuntimeException(__('dashboard.Could not read project API keys.'));
        }

        return ['publishable' => $publishable, 'steward' => $steward];
    }

    private function liveTunnelCallback(): string
    {
        $request = request();
        if (! $request instanceof Request || ! DevTunnel::isPublicDevHost($request->getHost())) {
            return '';
        }

        $origin = rtrim($request->getSchemeAndHttpHost(), '/');

        return DevTunnel::isHttpsUrl($origin)
            ? $origin.route('lab.oauth.supabase.return', absolute: false)
            : '';
    }

    private function rememberedTunnelCallback(): string
    {
        $origin = DevTunnel::rememberedOrigin();

        return $origin === ''
            ? ''
            : $origin.route('lab.oauth.supabase.return', absolute: false);
    }

    private function sanitizeReturnPath(?string $path): ?string
    {
        return LocalReturnPath::deskOrLab($path);
    }
}
