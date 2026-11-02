<?php

namespace App\Ai\Lab;

use App\Ai\Data\ChatMessage;
use App\Ai\Data\ChatRole;
use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Lab\LabProjectAccess;
use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

/**
 * Persists Lab turns and mints a titled project on the first user message.
 */
final class LabProjectRecorder
{
    public function __construct(
        private readonly ProjectTitler $titler,
        private readonly SiteWorkspace $workspaces,
        private readonly EntitlementGate $entitlements,
    ) {}

    /**
     * @param  list<ChatMessage>  $messages
     * @param  array<string, mixed>|null  $userMetadata
     * @param  array{model: string, credits: int, input_tokens: int, output_tokens: int}|null  $usage
     * @return array{project: LabProject, assistant_message_id: ?int}
     */
    public function sync(
        ?string $projectUuid,
        array $messages,
        string $assistantContent,
        ?User $user = null,
        bool $persistUser = true,
        ?string $thought = null,
        ?array $userMetadata = null,
        ?array $usage = null,
        bool $persistAssistant = true,
        ?string $title = null,
    ): array {
        return DB::transaction(function () use ($projectUuid, $messages, $assistantContent, $user, $persistUser, $thought, $userMetadata, $usage, $persistAssistant, $title) {
            $project = $this->resolve($projectUuid, $messages, $user, $title);

            $lastUser = $this->lastUserMessage($messages);

            // Silent state triggers (Switch / Skip / agent loop) must not invent user chat rows.
            // Preview-edit turns may persist an empty body when metadata.previewEdits carries the target.
            if ($persistUser && $lastUser !== null) {
                $content = trim($lastUser->content);
                if ($content !== '' || $userMetadata) {
                    $project->messages()->create([
                        'role' => ChatRole::User->value,
                        'content' => $content,
                        'metadata' => $userMetadata ?: null,
                    ]);
                }
            }

            $assistantContent = trim($assistantContent);
            $assistantMessageId = null;
            $metadata = $this->assistantMetadata($thought, $usage);

            if ($persistAssistant) {
                if ($assistantContent !== '') {
                    $row = $project->messages()->create([
                        'role' => ChatRole::Assistant->value,
                        'content' => $assistantContent,
                        'metadata' => $metadata,
                    ]);
                    $assistantMessageId = (int) $row->id;
                } else {
                    // Always mint a fresh chrome carrier for this turn — tool-only
                    // replies (and silent Switch) must never reuse a prior assistant
                    // row, or later chat tools overwrite Switch / vanish on F5.
                    $row = $project->messages()->create([
                        'role' => ChatRole::Assistant->value,
                        'content' => '',
                        'metadata' => $metadata,
                    ]);
                    $assistantMessageId = (int) $row->id;
                }
            }

            $this->workspaces->ensure($project);

            return [
                'project' => $project->fresh(['messages']),
                'assistant_message_id' => $assistantMessageId,
            ];
        });
    }

    /**
     * Seed assistant metadata so <thought> survives F5 before the client PUT.
     *
     * @param  array{model: string, credits: int, input_tokens: int, output_tokens: int}|null  $usage
     * @return array<string, mixed>|null
     */
    private function assistantMetadata(?string $thought, ?array $usage): ?array
    {
        $metadata = $this->thinkingMetadata($thought) ?? [];

        if (is_array($usage) && filled($usage['model'] ?? null)) {
            $metadata['usage'] = [
                'model' => (string) $usage['model'],
                'credits' => max(0, (int) ($usage['credits'] ?? 0)),
                'input_tokens' => max(0, (int) ($usage['input_tokens'] ?? 0)),
                'output_tokens' => max(0, (int) ($usage['output_tokens'] ?? 0)),
            ];
        }

        return $metadata === [] ? null : $metadata;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function thinkingMetadata(?string $thought): ?array
    {
        $text = trim((string) $thought);
        if ($text === '') {
            return null;
        }

        if (function_exists('mb_substr')) {
            $text = mb_substr($text, 0, 20_000);
        } else {
            $text = substr($text, 0, 20_000);
        }

        return [
            'thinking' => [
                'status' => 'done',
                'text' => $text,
                'durationSec' => 0,
            ],
        ];
    }

    /**
     * @param  list<ChatMessage>  $messages
     */
    private function resolve(?string $projectUuid, array $messages, ?User $user, ?string $title = null): LabProject
    {
        if ($user === null) {
            throw new AuthorizationException('Lab requires an authenticated user.');
        }

        if (filled($projectUuid)) {
            $existing = LabProject::query()->where('uuid', $projectUuid)->first();

            if ($existing !== null) {
                LabProjectAccess::assertWritable($existing, $user);
                if (filled($title)
                    && $this->titler->isPlaceholder((string) $existing->title)
                    && ! $this->titler->isPlaceholder((string) $title)
                ) {
                    $existing->forceFill(['title' => $title])->save();
                }

                return $existing;
            }
        }

        $firstUser = $this->firstUserContent($messages) ?? '';

        $this->entitlements->assertQuota($user, EntitlementCatalog::PROJECTS);

        $attributes = [
            'title' => filled($title) ? $title : $this->titler->name($firstUser),
            'notes' => 'lab',
            'user_id' => $user->id,
            'workspace_status' => 'pending',
            'stack' => SiteWorkspace::STACK,
        ];

        if (filled($projectUuid)) {
            $attributes['uuid'] = $projectUuid;
        }

        return LabProject::query()->create($attributes);
    }

    /**
     * @param  list<ChatMessage>  $messages
     */
    private function firstUserContent(array $messages): ?string
    {
        foreach ($messages as $message) {
            if ($message->role === ChatRole::User && trim($message->content) !== '') {
                return trim($message->content);
            }
        }

        return null;
    }

    /**
     * @param  list<ChatMessage>  $messages
     */
    private function lastUserMessage(array $messages): ?ChatMessage
    {
        for ($i = count($messages) - 1; $i >= 0; $i--) {
            $message = $messages[$i];

            if ($message->role === ChatRole::User) {
                return $message;
            }
        }

        return null;
    }

    /**
     * @param  list<ChatMessage>  $messages
     */
    private function lastUserContent(array $messages): ?string
    {
        for ($i = count($messages) - 1; $i >= 0; $i--) {
            $message = $messages[$i];

            if ($message->role === ChatRole::User && trim($message->content) !== '') {
                return trim($message->content);
            }
        }

        return null;
    }
}
