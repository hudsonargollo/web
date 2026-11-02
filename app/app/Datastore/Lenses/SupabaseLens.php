<?php

namespace App\Datastore\Lenses;

use App\Datastore\DatastoreHttp;
use App\Datastore\DatastoreKind;
use Throwable;

/**
 * Talks to a Supabase project: PostgREST OpenAPI for shape, Management API for SQL.
 */
final class SupabaseLens
{
    /**
     * @param  array{
     *     host_url: string,
     *     publishable_token: string,
     *     steward_token: string,
     *     console_token: string,
     *     project_ref: string
     * }  $plane
     * @return array{ok: bool, tables: list<array{name: string, columns: list<array{name: string, type: string, nullable: bool}>}>, error: string|null}
     */
    public function survey(array $plane): array
    {
        $host = rtrim((string) ($plane['host_url'] ?? ''), '/');
        $token = (string) (($plane['steward_token'] ?? '') !== ''
            ? $plane['steward_token']
            : ($plane['publishable_token'] ?? ''));

        if ($host === '' || $token === '') {
            return ['ok' => false, 'tables' => [], 'error' => 'Datastore host or publishable key is missing.'];
        }

        try {
            $response = DatastoreHttp::make()
                ->withHeaders([
                    'apikey' => $token,
                    'Authorization' => 'Bearer '.$token,
                    'Accept' => 'application/openapi+json',
                ])
                ->get($host.'/rest/v1/');
        } catch (Throwable $e) {
            return ['ok' => false, 'tables' => [], 'error' => 'Could not reach the data plane.'];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'tables' => [], 'error' => 'Data plane refused the schema survey (HTTP '.$response->status().').'];
        }

        $spec = $response->json();
        if (! is_array($spec)) {
            return ['ok' => false, 'tables' => [], 'error' => 'Schema survey returned a non-object payload.'];
        }

        return [
            'ok' => true,
            'tables' => $this->tablesFromOpenApi($spec),
            'error' => null,
        ];
    }

    /**
     * @param  array{host_url: string, publishable_token: string, steward_token: string}  $plane
     * @return array{ok: bool, table: string, rows: list<array<string, mixed>>, total: int|null, error: string|null}
     */
    public function rows(array $plane, string $table, int $limit = 50): array
    {
        $table = trim($table);
        $limit = min(100, max(1, $limit));
        if ($table === '' || preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $table) !== 1) {
            return ['ok' => false, 'table' => $table, 'rows' => [], 'total' => null, 'error' => 'Unknown table.'];
        }

        $host = rtrim((string) ($plane['host_url'] ?? ''), '/');
        $token = (string) (($plane['steward_token'] ?? '') !== ''
            ? $plane['steward_token']
            : ($plane['publishable_token'] ?? ''));
        if ($host === '' || $token === '') {
            return ['ok' => false, 'table' => $table, 'rows' => [], 'total' => null, 'error' => 'Datastore host or publishable key is missing.'];
        }

        try {
            $response = DatastoreHttp::make()
                ->withHeaders([
                    'apikey' => $token,
                    'Authorization' => 'Bearer '.$token,
                    'Prefer' => 'count=exact',
                    'Range' => '0-'.($limit - 1),
                    'Accept' => 'application/json',
                ])
                ->get($host.'/rest/v1/'.$table, [
                    'select' => '*',
                    'limit' => $limit,
                ]);
        } catch (Throwable) {
            return ['ok' => false, 'table' => $table, 'rows' => [], 'total' => null, 'error' => 'Could not read rows.'];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'table' => $table, 'rows' => [], 'total' => null, 'error' => 'Could not read rows (HTTP '.$response->status().').'];
        }

        $payload = $response->json();
        $rows = is_array($payload) && array_is_list($payload) ? $payload : [];
        $clean = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $clean[] = $row;
            }
        }

        $total = null;
        $range = (string) $response->header('Content-Range', '');
        if (preg_match('/\/(\d+)\s*$/', $range, $match) === 1) {
            $total = (int) $match[1];
        }

        return [
            'ok' => true,
            'table' => $table,
            'rows' => $clean,
            'total' => $total ?? count($clean),
            'error' => null,
        ];
    }

    /**
     * @param  array{
     *     host_url: string,
     *     console_token: string,
     *     project_ref: string
     * }  $plane
     * @param  list<string>  $statements
     * @return array{ok: bool, applied: int, error: string|null, results: list<mixed>}
     */
    public function revise(array $plane, array $statements): array
    {
        $ref = (string) ($plane['project_ref'] ?? '');
        $console = (string) ($plane['console_token'] ?? '');
        if ($ref === '' || $console === '') {
            return [
                'ok' => false,
                'applied' => 0,
                'error' => 'Schema revisions need a management token and a *.supabase.co project URL.',
                'results' => [],
            ];
        }

        $base = rtrim((string) config('datastore.kinds.'.DatastoreKind::SUPABASE.'.console_base', 'https://api.supabase.com'), '/');
        $applied = 0;
        $results = [];

        foreach ($statements as $statement) {
            try {
                $response = DatastoreHttp::make((int) config('datastore.http.revise_timeout', 30))
                    ->withToken($console)
                    ->post($base.'/v1/projects/'.$ref.'/database/query', [
                        'query' => $statement,
                    ]);
            } catch (Throwable) {
                return [
                    'ok' => false,
                    'applied' => $applied,
                    'error' => 'Management console was unreachable while applying SQL.',
                    'results' => $results,
                ];
            }

            if (! $response->successful()) {
                $message = $this->consoleError($response->json())
                    ?: 'Management console refused the statement (HTTP '.$response->status().').';

                return [
                    'ok' => false,
                    'applied' => $applied,
                    'error' => $message,
                    'results' => $results,
                ];
            }

            $applied++;
            $payload = $response->json();
            $results[] = is_array($payload) ? $this->trimResult($payload) : $payload;
        }

        return [
            'ok' => true,
            'applied' => $applied,
            'error' => null,
            'results' => $results,
        ];
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return list<array{name: string, columns: list<array{name: string, type: string, nullable: bool}>}>
     */
    public function tablesFromOpenApi(array $spec): array
    {
        $schemas = [];
        $definitions = $spec['definitions'] ?? null;
        $components = data_get($spec, 'components.schemas');
        if (is_array($definitions)) {
            $schemas = $definitions;
        } elseif (is_array($components)) {
            $schemas = $components;
        }

        $names = [];
        $paths = is_array($spec['paths'] ?? null) ? $spec['paths'] : [];
        foreach (array_keys($paths) as $path) {
            $path = trim((string) $path, '/');
            if ($path === '' || str_starts_with($path, 'rpc/')) {
                continue;
            }
            $table = explode('/', $path)[0] ?? '';
            if ($table !== '' && ! str_contains($table, '{')) {
                $names[$table] = true;
            }
        }

        if ($names === [] && $schemas !== []) {
            foreach (array_keys($schemas) as $name) {
                $names[(string) $name] = true;
            }
        }

        $tables = [];
        foreach (array_keys($names) as $name) {
            $schema = is_array($schemas[$name] ?? null) ? $schemas[$name] : [];
            $required = is_array($schema['required'] ?? null) ? $schema['required'] : [];
            $properties = is_array($schema['properties'] ?? null) ? $schema['properties'] : [];
            $columns = [];
            foreach ($properties as $column => $meta) {
                $meta = is_array($meta) ? $meta : [];
                $type = (string) ($meta['format'] ?? $meta['type'] ?? 'unknown');
                $columns[] = [
                    'name' => (string) $column,
                    'type' => $type,
                    'nullable' => ! in_array($column, $required, true),
                ];
            }
            $tables[] = [
                'name' => (string) $name,
                'columns' => $columns,
            ];
        }

        usort($tables, static fn (array $a, array $b): int => strcmp($a['name'], $b['name']));

        return $tables;
    }

    private function consoleError(mixed $payload): ?string
    {
        if (! is_array($payload)) {
            return null;
        }

        foreach (['message', 'error', 'msg'] as $key) {
            if (filled($payload[$key] ?? null)) {
                return mb_substr((string) $payload[$key], 0, 280);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>|list<mixed>  $payload
     * @return array<string, mixed>|list<mixed>
     */
    private function trimResult(array $payload): array
    {
        $encoded = json_encode($payload);
        if ($encoded !== false && strlen($encoded) > 4_000) {
            return ['_truncated' => true, 'bytes' => strlen($encoded)];
        }

        return $payload;
    }
}
