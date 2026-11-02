<?php

namespace App\Datastore;

use App\Datastore\Lenses\SupabaseLens;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Applies fenced SQL against the workspace data plane.
 */
final class DatastoreRevisor
{
    public function __construct(
        private readonly SupabaseLinkBroker $broker,
        private readonly SqlFence $fence,
        private readonly SupabaseLens $supabase,
    ) {}

    /**
     * @return array{
     *     ok: bool,
     *     kind: string,
     *     applied: int,
     *     destructive: bool,
     *     needs_ack: bool,
     *     message: string,
     *     statements: list<string>
     * }
     */
    public function revise(
        string $sql,
        bool $acknowledgeDestructive = false,
        string $kind = DatastoreKind::SUPABASE,
        ?User $user = null,
    ): array {
        $plane = $this->broker->planeFor($user);

        if (! $plane['ready']) {
            return $this->fail($kind, 'No data plane is attached. Connect Supabase from the Lab + menu, then pick a project.');
        }

        if (! $plane['can_revise']) {
            return $this->fail($kind, 'Schema revisions need a connected Supabase account. Use the Lab + menu.');
        }

        $verdict = $this->fence->inspect($sql);
        if ($verdict['blocked']) {
            return $this->fail($kind, (string) $verdict['reason'], $verdict['statements'], $verdict['destructive']);
        }

        if ($verdict['destructive'] && ! $acknowledgeDestructive) {
            return [
                'ok' => false,
                'kind' => $kind,
                'applied' => 0,
                'destructive' => true,
                'needs_ack' => true,
                'message' => 'This SQL looks destructive (DROP / ALTER / DELETE / GRANT). Call revise_datastore again with acknowledge_destructive=true if the user asked for it.',
                'statements' => $verdict['statements'],
            ];
        }

        $result = $this->supabase->revise($plane, $verdict['statements']);
        if (! ($result['ok'] ?? false)) {
            return $this->fail(
                $kind,
                (string) ($result['error'] ?? 'Revision failed.'),
                $verdict['statements'],
                $verdict['destructive'],
                (int) ($result['applied'] ?? 0),
            );
        }

        Cache::forget('datastore:survey:'.hash('sha256', $kind.'|'.$plane['host_url'].'|'.substr($plane['steward_token'] ?: $plane['publishable_token'], 0, 12)));

        $applied = (int) ($result['applied'] ?? 0);

        return [
            'ok' => true,
            'kind' => $kind,
            'applied' => $applied,
            'destructive' => $verdict['destructive'],
            'needs_ack' => false,
            'message' => 'Applied '.$applied.' statement'.($applied === 1 ? '' : 's').'. Call survey_datastore next to refresh the table map.',
            'statements' => $verdict['statements'],
        ];
    }

    /**
     * @param  list<string>  $statements
     * @return array{
     *     ok: bool,
     *     kind: string,
     *     applied: int,
     *     destructive: bool,
     *     needs_ack: bool,
     *     message: string,
     *     statements: list<string>
     * }
     */
    private function fail(
        string $kind,
        string $message,
        array $statements = [],
        bool $destructive = false,
        int $applied = 0,
    ): array {
        return [
            'ok' => false,
            'kind' => $kind,
            'applied' => $applied,
            'destructive' => $destructive,
            'needs_ack' => false,
            'message' => $message,
            'statements' => $statements,
        ];
    }
}
