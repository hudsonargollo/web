<?php

namespace App\Datastore;

use App\Models\User;
use Illuminate\Support\Carbon;
use RuntimeException;
use Throwable;

/**
 * Auth users, Auth config, and project restart for the attached Supabase plane.
 */
final class SupabaseCloud
{
    public function __construct(
        private readonly SupabaseLinkBroker $broker,
    ) {}

    /**
     * @return array{allow_signup: bool, allow_anonymous: bool, email_password: bool, google: bool}
     */
    public function authConfig(User $user): array
    {
        $plane = $this->requirePlane($user);
        $ref = (string) $plane['project_ref'];
        $token = (string) $plane['console_token'];
        if ($ref === '' || $token === '') {
            throw new RuntimeException('Reconnect Supabase to manage authentication.');
        }

        try {
            $payload = DatastoreHttp::make()
                ->withToken($token)
                ->get($this->consoleBase().'/v1/projects/'.$ref.'/config/auth')
                ->throw()
                ->json();
        } catch (Throwable $e) {
            throw new RuntimeException('Could not read auth settings.', previous: $e);
        }

        $payload = is_array($payload) ? $payload : [];

        return $this->normalizeAuth($payload);
    }

    /**
     * @param  array{allow_signup?: bool, allow_anonymous?: bool, email_password?: bool, google?: bool}  $patch
     * @return array{allow_signup: bool, allow_anonymous: bool, email_password: bool, google: bool}
     */
    public function saveAuth(User $user, array $patch): array
    {
        $current = $this->authConfig($user);
        $next = array_merge($current, array_intersect_key($patch, $current));
        $plane = $this->requirePlane($user);
        $ref = (string) $plane['project_ref'];
        $token = (string) $plane['console_token'];
        if ($ref === '' || $token === '') {
            throw new RuntimeException('Reconnect Supabase to manage authentication.');
        }

        try {
            DatastoreHttp::make()
                ->withToken($token)
                ->patch($this->consoleBase().'/v1/projects/'.$ref.'/config/auth', [
                    'DISABLE_SIGNUP' => ! $next['allow_signup'],
                    'EXTERNAL_ANONYMOUS_USERS_ENABLED' => $next['allow_anonymous'],
                    'EXTERNAL_EMAIL_ENABLED' => $next['email_password'],
                    'EXTERNAL_GOOGLE_ENABLED' => $next['google'],
                ])
                ->throw();
        } catch (Throwable $e) {
            throw new RuntimeException('Could not save auth settings.', previous: $e);
        }

        return $next;
    }

    /**
     * @return array{users: list<array{id: string, email: string, created_at: string}>, series: list<array{day: string, label: string, count: int}>}
     */
    public function users(User $user, string $query = ''): array
    {
        $plane = $this->requirePlane($user);
        $needle = mb_strtolower(trim($query));

        $rows = $this->fetchGotrueUsers($plane);

        if ($needle !== '') {
            $rows = array_values(array_filter($rows, static function (array $row) use ($needle): bool {
                return str_contains(mb_strtolower($row['email'].' '.$row['id']), $needle);
            }));
        }

        return [
            'users' => $rows,
            'series' => $this->signupSeries($rows),
        ];
    }

    /**
     * @return array{id: string, email: string, created_at: string, invited: bool}
     */
    public function addUser(User $user, string $email, ?string $password, bool $invite): array
    {
        $email = mb_strtolower(trim($email));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Enter a valid email.');
        }

        $plane = $this->requirePlane($user);
        $host = rtrim((string) $plane['host_url'], '/');
        $steward = (string) $plane['steward_token'];
        if ($host === '' || $steward === '') {
            throw new RuntimeException('Reconnect Supabase to manage users.');
        }

        $path = $invite ? '/auth/v1/invite' : '/auth/v1/admin/users';
        $body = $invite
            ? ['email' => $email]
            : ['email' => $email, 'password' => (string) $password, 'email_confirm' => true];

        if (! $invite && trim((string) $password) === '') {
            throw new RuntimeException('A password is required to create a user.');
        }

        try {
            $payload = DatastoreHttp::make()
                ->withHeaders([
                    'apikey' => $steward,
                    'Authorization' => 'Bearer '.$steward,
                ])
                ->post($host.$path, $body)
                ->throw()
                ->json();
        } catch (Throwable $e) {
            throw new RuntimeException($invite ? 'Could not send the invitation.' : 'Could not create the user.', previous: $e);
        }

        $payload = is_array($payload) ? $payload : [];
        $userRow = is_array($payload['user'] ?? null) ? $payload['user'] : $payload;

        return [
            'id' => (string) ($userRow['id'] ?? ''),
            'email' => (string) ($userRow['email'] ?? $email),
            'created_at' => (string) ($userRow['created_at'] ?? now()->toIso8601String()),
            'invited' => $invite,
        ];
    }

    public function restart(User $user): void
    {
        $plane = $this->requirePlane($user);
        $ref = (string) $plane['project_ref'];
        $token = (string) $plane['console_token'];
        if ($ref === '' || $token === '') {
            throw new RuntimeException('Reconnect Supabase to restart the database.');
        }

        try {
            DatastoreHttp::make()
                ->withToken($token)
                ->post($this->consoleBase().'/v1/projects/'.$ref.'/restart')
                ->throw();
        } catch (Throwable $e) {
            throw new RuntimeException('Could not restart the database.', previous: $e);
        }
    }

    /**
     * @return array{topic: string, ok: bool, rows: list<array<string, mixed>>, error: string|null}
     */
    public function catalog(User $user, string $topic): array
    {
        $topic = strtolower(trim($topic));
        $allowed = ['security', 'functions', 'storage', 'secrets', 'logs', 'advanced'];
        if (! in_array($topic, $allowed, true)) {
            throw new RuntimeException('Unknown catalog topic.');
        }

        $plane = $this->requirePlane($user);

        return match ($topic) {
            'security' => $this->liveSecurity($plane),
            'functions' => $this->liveFunctions($plane),
            'storage' => $this->liveStorage($plane),
            'secrets' => $this->liveSecrets($plane),
            'logs' => $this->liveLogs($plane),
            default => $this->liveAdvanced($plane),
        };
    }

    /**
     * @return array{host_url: string, publishable_token: string, steward_token: string, console_token: string, project_ref: string, ready: bool}
     */
    private function requirePlane(User $user): array
    {
        $plane = $this->broker->planeFor($user);
        if (! ($plane['ready'] ?? false)) {
            throw new RuntimeException('No data plane is attached.');
        }

        return $plane;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{allow_signup: bool, allow_anonymous: bool, email_password: bool, google: bool}
     */
    private function normalizeAuth(array $payload): array
    {
        $disable = $payload['DISABLE_SIGNUP'] ?? $payload['disable_signup'] ?? false;

        return [
            'allow_signup' => ! $this->truthy($disable),
            'allow_anonymous' => $this->truthy($payload['EXTERNAL_ANONYMOUS_USERS_ENABLED'] ?? $payload['external_anonymous_users_enabled'] ?? false),
            'email_password' => $this->truthy($payload['EXTERNAL_EMAIL_ENABLED'] ?? $payload['external_email_enabled'] ?? true),
            'google' => $this->truthy($payload['EXTERNAL_GOOGLE_ENABLED'] ?? $payload['external_google_enabled'] ?? false),
        ];
    }

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true);
    }

    /**
     * @param  array{host_url: string, steward_token: string}  $plane
     * @return list<array{id: string, email: string, created_at: string}>
     */
    private function fetchGotrueUsers(array $plane): array
    {
        $host = rtrim((string) $plane['host_url'], '/');
        $steward = (string) $plane['steward_token'];
        if ($host === '' || $steward === '') {
            throw new RuntimeException('Reconnect Supabase to manage users.');
        }

        try {
            $payload = DatastoreHttp::make()
                ->withHeaders([
                    'apikey' => $steward,
                    'Authorization' => 'Bearer '.$steward,
                ])
                ->get($host.'/auth/v1/admin/users', ['page' => 1, 'per_page' => 200])
                ->throw()
                ->json();
        } catch (Throwable $e) {
            throw new RuntimeException('Could not list users.', previous: $e);
        }

        $list = is_array($payload['users'] ?? null) ? $payload['users'] : (is_array($payload) && array_is_list($payload) ? $payload : []);
        $out = [];
        foreach ($list as $row) {
            if (! is_array($row)) {
                continue;
            }
            $email = trim((string) ($row['email'] ?? ''));
            $id = trim((string) ($row['id'] ?? ''));
            if ($id === '') {
                continue;
            }
            $out[] = [
                'id' => $id,
                'email' => $email,
                'created_at' => (string) ($row['created_at'] ?? ''),
            ];
        }

        return $out;
    }

    /**
     * @param  list<array{created_at: string}>  $users
     * @return list<array{day: string, label: string, count: int}>
     */
    private function signupSeries(array $users): array
    {
        $counts = [];
        foreach ($users as $row) {
            try {
                $day = Carbon::parse((string) ($row['created_at'] ?? ''))->utc()->format('Y-m-d');
            } catch (Throwable) {
                continue;
            }
            $counts[$day] = ($counts[$day] ?? 0) + 1;
        }

        $cursor = now()->utc()->startOfDay()->subDays(29);
        $out = [];
        for ($i = 0; $i < 30; $i++) {
            $day = $cursor->format('Y-m-d');
            $out[] = [
                'day' => $day,
                'label' => $cursor->format('M j'),
                'count' => (int) ($counts[$day] ?? 0),
            ];
            $cursor->addDay();
        }

        return $out;
    }

    /**
     * @param  array{console_token: string, project_ref: string}  $plane
     * @return array{topic: string, ok: bool, rows: list<array<string, mixed>>, error: string|null}
     */
    private function liveSecurity(array $plane): array
    {
        $sql = "select tablename as table, policyname as name, cmd as command, roles::text as roles from pg_policies where schemaname = 'public' order by tablename, policyname";
        $fetched = $this->consoleQuery($plane, $sql);
        if (! $fetched['ok']) {
            return ['topic' => 'security', 'ok' => false, 'rows' => [], 'error' => $fetched['error']];
        }

        return ['topic' => 'security', 'ok' => true, 'rows' => $fetched['rows'], 'error' => null];
    }

    /**
     * @param  array{console_token: string, project_ref: string}  $plane
     * @return array{topic: string, ok: bool, rows: list<array<string, mixed>>, error: string|null}
     */
    private function liveFunctions(array $plane): array
    {
        $fetched = $this->consoleGet($plane, '/v1/projects/'.$plane['project_ref'].'/functions');
        if (! $fetched['ok']) {
            return ['topic' => 'functions', 'ok' => false, 'rows' => [], 'error' => $fetched['error']];
        }

        $rows = [];
        foreach ($fetched['rows'] as $row) {
            $slug = trim((string) ($row['slug'] ?? $row['name'] ?? ''));
            if ($slug === '') {
                continue;
            }
            $rows[] = [
                'slug' => $slug,
                'status' => (string) ($row['status'] ?? ''),
                'updated_at' => (string) ($row['updated_at'] ?? $row['version'] ?? ''),
            ];
        }

        return ['topic' => 'functions', 'ok' => true, 'rows' => $rows, 'error' => null];
    }

    /**
     * @param  array{host_url: string, steward_token: string}  $plane
     * @return array{topic: string, ok: bool, rows: list<array<string, mixed>>, error: string|null}
     */
    private function liveStorage(array $plane): array
    {
        $host = rtrim((string) $plane['host_url'], '/');
        $steward = (string) $plane['steward_token'];
        if ($host === '' || $steward === '') {
            return ['topic' => 'storage', 'ok' => false, 'rows' => [], 'error' => 'Reconnect Supabase to list buckets.'];
        }

        try {
            $payload = DatastoreHttp::make()
                ->withHeaders([
                    'apikey' => $steward,
                    'Authorization' => 'Bearer '.$steward,
                ])
                ->get($host.'/storage/v1/bucket')
                ->throw()
                ->json();
        } catch (Throwable $e) {
            return ['topic' => 'storage', 'ok' => false, 'rows' => [], 'error' => 'Could not list storage buckets.'];
        }

        $rows = [];
        foreach ($this->rowsFromJson($payload) as $row) {
            $name = trim((string) ($row['name'] ?? $row['id'] ?? ''));
            if ($name === '') {
                continue;
            }
            $rows[] = [
                'name' => $name,
                'public' => $this->truthy($row['public'] ?? false) ? 'public' : 'private',
                'file_size_limit' => $row['file_size_limit'] ?? '',
            ];
        }

        return ['topic' => 'storage', 'ok' => true, 'rows' => $rows, 'error' => null];
    }

    /**
     * @param  array{console_token: string, project_ref: string}  $plane
     * @return array{topic: string, ok: bool, rows: list<array<string, mixed>>, error: string|null}
     */
    private function liveSecrets(array $plane): array
    {
        $fetched = $this->consoleGet($plane, '/v1/projects/'.$plane['project_ref'].'/secrets');
        if (! $fetched['ok']) {
            return ['topic' => 'secrets', 'ok' => false, 'rows' => [], 'error' => $fetched['error']];
        }

        $rows = [];
        foreach ($fetched['rows'] as $row) {
            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $rows[] = [
                'name' => $name,
                'updated_at' => (string) ($row['updated_at'] ?? ''),
            ];
        }

        return ['topic' => 'secrets', 'ok' => true, 'rows' => $rows, 'error' => null];
    }

    /**
     * @param  array{console_token: string, project_ref: string}  $plane
     * @return array{topic: string, ok: bool, rows: list<array<string, mixed>>, error: string|null}
     */
    private function liveLogs(array $plane): array
    {
        $ref = (string) $plane['project_ref'];
        $token = (string) $plane['console_token'];
        if ($ref === '' || $token === '') {
            return ['topic' => 'logs', 'ok' => false, 'rows' => [], 'error' => 'Reconnect Supabase to read logs.'];
        }

        $end = now()->utc();
        $start = $end->copy()->subHours(24);

        try {
            $payload = DatastoreHttp::make()
                ->withToken($token)
                ->get($this->consoleBase().'/v1/projects/'.$ref.'/analytics/endpoints/logs.all', [
                    'iso_timestamp_start' => $start->toIso8601String(),
                    'iso_timestamp_end' => $end->toIso8601String(),
                    'sql' => 'select id, timestamp, event_message from edge_logs order by timestamp desc limit 40',
                ])
                ->throw()
                ->json();
        } catch (Throwable) {
            return ['topic' => 'logs', 'ok' => false, 'rows' => [], 'error' => 'Could not read project logs.'];
        }

        $rows = [];
        foreach ($this->rowsFromJson($payload['result'] ?? $payload) as $row) {
            $message = trim((string) ($row['event_message'] ?? $row['message'] ?? $row['msg'] ?? ''));
            $encoded = json_encode($row, JSON_UNESCAPED_SLASHES);
            $rows[] = [
                'at' => (string) ($row['timestamp'] ?? $row['at'] ?? ''),
                'message' => mb_substr($message !== '' ? $message : (is_string($encoded) ? $encoded : ''), 0, 180),
            ];
            if (count($rows) >= 40) {
                break;
            }
        }

        return ['topic' => 'logs', 'ok' => true, 'rows' => $rows, 'error' => null];
    }

    /**
     * @param  array{console_token: string, project_ref: string, host_url: string}  $plane
     * @return array{topic: string, ok: bool, rows: list<array<string, mixed>>, error: string|null}
     */
    private function liveAdvanced(array $plane): array
    {
        $fetched = $this->consoleGet($plane, '/v1/projects/'.$plane['project_ref']);
        if (! $fetched['ok']) {
            return ['topic' => 'advanced', 'ok' => false, 'rows' => [], 'error' => $fetched['error']];
        }

        $row = $fetched['rows'][0] ?? [];
        $rows = [
            ['key' => 'Project', 'value' => (string) ($row['name'] ?? '')],
            ['key' => 'Ref', 'value' => (string) ($row['id'] ?? $plane['project_ref'])],
            ['key' => 'Region', 'value' => (string) ($row['region'] ?? '')],
            ['key' => 'Status', 'value' => (string) ($row['status'] ?? '')],
            ['key' => 'Host', 'value' => (string) ($plane['host_url'] ?? '')],
        ];

        $db = is_array($row['database'] ?? null) ? $row['database'] : [];
        if (filled($db['version'] ?? null)) {
            $rows[] = ['key' => 'Postgres', 'value' => (string) $db['version']];
        }

        return ['topic' => 'advanced', 'ok' => true, 'rows' => array_values(array_filter($rows, static fn (array $item): bool => trim((string) $item['value']) !== '')), 'error' => null];
    }

    /**
     * @param  array{console_token: string, project_ref: string}  $plane
     * @return array{ok: bool, rows: list<array<string, mixed>>, error: string|null}
     */
    private function consoleQuery(array $plane, string $sql): array
    {
        $ref = (string) $plane['project_ref'];
        $token = (string) $plane['console_token'];
        if ($ref === '' || $token === '') {
            return ['ok' => false, 'rows' => [], 'error' => 'Reconnect Supabase to run catalog queries.'];
        }

        try {
            $payload = DatastoreHttp::make()
                ->withToken($token)
                ->post($this->consoleBase().'/v1/projects/'.$ref.'/database/query', ['query' => $sql])
                ->throw()
                ->json();
        } catch (Throwable) {
            return ['ok' => false, 'rows' => [], 'error' => 'Could not query the database catalog.'];
        }

        return ['ok' => true, 'rows' => $this->rowsFromJson($payload), 'error' => null];
    }

    /**
     * @param  array{console_token: string, project_ref: string}  $plane
     * @return array{ok: bool, rows: list<array<string, mixed>>, error: string|null}
     */
    private function consoleGet(array $plane, string $path): array
    {
        $token = (string) $plane['console_token'];
        if ($token === '') {
            return ['ok' => false, 'rows' => [], 'error' => 'Reconnect Supabase to read this catalog.'];
        }

        try {
            $payload = DatastoreHttp::make()
                ->withToken($token)
                ->get($this->consoleBase().$path)
                ->throw()
                ->json();
        } catch (Throwable) {
            return ['ok' => false, 'rows' => [], 'error' => 'Could not read that catalog from the project.'];
        }

        if (is_array($payload) && ! array_is_list($payload) && ! isset($payload[0])) {
            return ['ok' => true, 'rows' => [$payload], 'error' => null];
        }

        return ['ok' => true, 'rows' => $this->rowsFromJson($payload), 'error' => null];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function rowsFromJson(mixed $payload): array
    {
        if (! is_array($payload)) {
            return [];
        }
        if (isset($payload['result']) && is_array($payload['result'])) {
            $payload = $payload['result'];
        }
        if (isset($payload['data']) && is_array($payload['data'])) {
            $payload = $payload['data'];
        }
        $out = [];
        foreach ($payload as $row) {
            if (is_array($row) && ! array_is_list($row)) {
                $out[] = $row;
            }
        }

        return $out;
    }

    private function consoleBase(): string
    {
        return rtrim((string) config('datastore.kinds.'.DatastoreKind::SUPABASE.'.console_base', 'https://api.supabase.com'), '/');
    }
}
