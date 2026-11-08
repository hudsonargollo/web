<?php

namespace App\Lab\Build;

use App\Ai\ChatGateway;
use App\Ai\Data\AgentStage;
use App\Ai\Data\ChatMessage;
use App\Ai\Data\ChatResponse;
use App\Ai\Lab\LabToolCatalog;
use App\Ai\ModelCatalog;
use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Entitlement\LabCreditMeter;
use App\Lab\SiteWorkspace;
use App\Models\Build;
use App\Models\LabProject;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Headless equivalent of the browser chat loop: Plan, then execute tool turns
 * until the model stops writing. Every budget here exists because nobody is
 * watching the run and a runaway loop bills real credits.
 */
final class BuildRunner
{
    public function __construct(
        private readonly ChatGateway $gateway,
        private readonly ModelCatalog $catalog,
        private readonly SiteWorkspace $workspace,
        private readonly BuildToolExecutor $tools,
        private readonly LabToolCatalog $toolCatalog,
        private readonly EntitlementGate $entitlements,
        private readonly LabCreditMeter $credits,
    ) {}

    public function run(Build $build): void
    {
        if ($build->status !== Build::STATUS_QUEUED) {
            return;
        }

        $user = $this->serviceUser();
        $modelId = $this->modelId();

        $maxTurns = max(1, (int) config('krikkit.build.max_turns', 40));
        $wallClock = max(60, (int) config('krikkit.build.wall_clock_seconds', 600));
        $deadline = microtime(true) + $wallClock;
        $maxFileBytes = (int) config('krikkit.build.max_file_bytes', 2 * 1024 * 1024);
        $maxTotalBytes = (int) config('krikkit.build.max_total_bytes', 50 * 1024 * 1024);
        $repeatLimit = max(1, (int) config('krikkit.build.repeat_error_limit', 3));

        // Fail before the first billed turn rather than mid-build.
        $this->entitlements->assertQuota($user, EntitlementCatalog::LAB_CREDITS);
        $this->entitlements->assertQuota($user, EntitlementCatalog::PROJECTS);

        $project = $this->projectFor($build, $user);
        $this->workspace->ensureStatic($project);

        $build->forceFill([
            'lab_project_id' => $project->id,
            'model' => $modelId,
            'status' => Build::STATUS_PLANNING,
            'stage' => AgentStage::Planner->value,
            'started_at' => now(),
            'error' => null,
        ])->save();

        $brief = BuildBrief::fromArray((string) $build->kind, is_array($build->brief) ? $build->brief : []);
        $prompt = $brief->prompt();

        $plan = $this->gateway->complete(
            $modelId,
            [ChatMessage::user($prompt)],
            'build',
            stage: AgentStage::Planner,
            contextPack: self::staticContextPack(),
        );
        $this->charge($build, $project, $user, $plan);

        $messages = [
            ChatMessage::user($prompt),
            ChatMessage::assistant($plan->content !== '' ? $plan->content : 'Plan complete. Execute the site now.'),
            // Gemini rejects payloads ending on a model turn; later turns end on tool results.
            ChatMessage::user('Execute the plan now with the tools. Write index.html first.'),
        ];

        $build->forceFill([
            'status' => Build::STATUS_BUILDING,
            'stage' => AgentStage::Executor->value,
        ])->save();

        $writtenTotal = 0;
        $toolTurns = 0;
        $lastErrors = null;
        $repeatCount = 0;

        for ($turn = 1; $turn <= $maxTurns; $turn++) {
            if (microtime(true) >= $deadline) {
                throw new BuildException("Build exceeded its {$wallClock}s wall clock budget");
            }

            $response = $this->gateway->complete(
                $modelId,
                $messages,
                'build',
                stage: AgentStage::Executor,
                contextPack: self::staticContextPack(),
                tools: $this->toolCatalog->headlessDefinitions(),
            );
            $this->charge($build, $project, $user, $response);
            $build->forceFill(['turns' => $turn])->save();

            if ($response->toolCalls === []) {
                if ($turn === 1) {
                    throw new BuildException('Executor returned no tool calls on its first turn');
                }

                break;
            }

            $applied = $this->tools->apply(
                $project,
                $response->toolCalls,
                $maxFileBytes,
                max(0, $maxTotalBytes - $writtenTotal),
            );
            $writtenTotal += $applied['wrote'];
            $toolTurns++;

            $signature = $applied['errors'] === [] ? null : implode(' | ', $applied['errors']);

            if ($signature !== null && $signature === $lastErrors) {
                $repeatCount++;

                if ($repeatCount >= $repeatLimit) {
                    throw new BuildException(
                        "Aborting after {$repeatLimit} identical tool failures: ".substr($signature, 0, 300)
                    );
                }
            } else {
                $lastErrors = $signature;
                $repeatCount = 1;
            }

            $build->forceFill(['tool_turns' => $toolTurns])->save();

            $messages[] = ChatMessage::assistant($response->content);
            $messages[] = ChatMessage::user(
                "[tool_results]\n".(json_encode($applied['results'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '[]')
            );
        }

        $files = $this->paths($this->workspace->tree($project));

        if (! in_array('index.html', $files, true)) {
            throw new BuildException('Build finished without an index.html at the workspace root');
        }

        $build->forceFill([
            'status' => Build::STATUS_READY,
            'stage' => null,
            'files' => count($files),
            'finished_at' => now(),
        ])->save();

        Log::info('krikkit.build.ready', [
            'build_id' => $build->id,
            'project_id' => $project->id,
            'turns' => $build->turns,
            'files' => $build->files,
            'bytes' => $writtenTotal,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private static function staticContextPack(): array
    {
        return ['pack' => ['safetyFlags' => ['staticSite' => true]]];
    }

    private function charge(Build $build, LabProject $project, User $user, ChatResponse $response): void
    {
        $usage = is_array($response->meta['usage'] ?? null) ? $response->meta['usage'] : [];
        $charged = $this->credits->quote($usage, $response->modelId, $response->toolCalls);

        if ($charged > 0) {
            $this->entitlements->settle($user, EntitlementCatalog::LAB_CREDITS, $charged);
            $project->recordCreditSpend($charged);
        }

        $build->forceFill([
            'tokens_in' => (int) $build->tokens_in + (int) ($usage['input_tokens'] ?? 0),
            'tokens_out' => (int) $build->tokens_out + (int) ($usage['output_tokens'] ?? 0),
        ])->save();
    }

    private function serviceUser(): User
    {
        $id = (int) config('krikkit.build.service_user_id');

        if ($id <= 0) {
            throw new BuildException('KRIKKIT_BUILD_SERVICE_USER_ID is not configured; machine builds need a dedicated owner account');
        }

        $user = User::query()->find($id);

        if (! $user instanceof User) {
            throw new BuildException("Service user {$id} does not exist");
        }

        return $user;
    }

    private function modelId(): string
    {
        foreach ([(string) config('krikkit.build.model'), (string) config('ai.default_model')] as $candidate) {
            $candidate = trim($candidate);

            if ($candidate !== '' && $this->catalog->has($candidate)) {
                return $candidate;
            }
        }

        throw new BuildException('No usable build model: set KRIKKIT_BUILD_MODEL or AI_DEFAULT_MODEL to a registered model id');
    }

    private function projectFor(Build $build, User $user): LabProject
    {
        if ($build->lab_project_id !== null) {
            return LabProject::query()->findOrFail($build->lab_project_id);
        }

        return LabProject::query()->create([
            'uuid' => (string) Str::uuid(),
            'title' => mb_substr((string) $build->title, 0, 120) ?: 'Untitled build',
            'user_id' => $user->id,
            'stack' => 'static',
            'workspace_status' => 'ready',
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $nodes
     * @return list<string>
     */
    private function paths(array $nodes): array
    {
        $paths = [];

        foreach ($nodes as $node) {
            if (($node['type'] ?? '') === 'folder') {
                $children = is_array($node['children'] ?? null) ? $node['children'] : [];
                $paths = [...$paths, ...$this->paths($children)];

                continue;
            }

            $path = (string) ($node['path'] ?? '');

            if ($path !== '') {
                $paths[] = $path;
            }
        }

        return $paths;
    }
}
