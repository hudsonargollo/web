<?php

namespace App\Lab;

use App\Ai\Data\ChatRole;
use App\Models\LabMessage;
use App\Models\LabProject;
use App\Models\User;
use Illuminate\Support\Collection;

final class LabUsageReport
{
    /**
     * @return list<array{user: ?User, credits: int, projects: int}>
     */
    public static function byUser(): array
    {
        return LabProject::query()
            ->with('user')
            ->get()
            ->groupBy(fn (LabProject $project): int => (int) ($project->user_id ?? 0))
            ->map(function (Collection $projects): array {
                /** @var LabProject $first */
                $first = $projects->first();

                return [
                    'user' => $first->user,
                    'credits' => (int) $projects->sum('credits_spent'),
                    'projects' => $projects->count(),
                ];
            })
            ->sortByDesc('credits')
            ->values()
            ->all();
    }

    /**
     * @return list<LabProject>
     */
    public static function byProject(): array
    {
        return LabProject::query()
            ->with('user')
            ->orderByDesc('credits_spent')
            ->orderByDesc('updated_at')
            ->get()
            ->all();
    }

    /**
     * @return array{
     *     projects: list<array{title: string, uuid: string, credits: int, updated: string}>,
     *     models: list<array{model: string, credits: int, turns: int, input_tokens: int, output_tokens: int}>
     * }
     */
    public static function forAccount(User $user): array
    {
        $projects = LabProject::query()
            ->where('user_id', $user->id)
            ->orderByDesc('credits_spent')
            ->orderByDesc('updated_at')
            ->get();

        $projectRows = $projects->map(fn (LabProject $project): array => [
            'title' => (string) ($project->title ?: __('settings.Untitled project')),
            'uuid' => (string) $project->uuid,
            'credits' => (int) $project->credits_spent,
            'updated' => optional($project->updated_at)?->toDayDateTimeString() ?? '—',
        ])->all();

        $ids = $projects->pluck('id')->all();
        $grouped = [];

        if ($ids !== []) {
            $messages = LabMessage::query()
                ->whereIn('lab_project_id', $ids)
                ->where('role', ChatRole::Assistant->value)
                ->whereNotNull('metadata')
                ->get(['metadata']);

            foreach ($messages as $message) {
                $usage = is_array($message->metadata['usage'] ?? null) ? $message->metadata['usage'] : null;
                if ($usage === null) {
                    continue;
                }

                $model = trim((string) ($usage['model'] ?? ''));
                if ($model === '') {
                    $model = __('dashboard.Unknown');
                }

                $grouped[$model] ??= [
                    'model' => $model,
                    'credits' => 0,
                    'turns' => 0,
                    'input_tokens' => 0,
                    'output_tokens' => 0,
                ];
                $grouped[$model]['credits'] += (int) ($usage['credits'] ?? 0);
                $grouped[$model]['turns']++;
                $grouped[$model]['input_tokens'] += (int) ($usage['input_tokens'] ?? $usage['prompt_tokens'] ?? 0);
                $grouped[$model]['output_tokens'] += (int) ($usage['output_tokens'] ?? $usage['completion_tokens'] ?? 0);
            }
        }

        uasort($grouped, fn (array $a, array $b): int => $b['credits'] <=> $a['credits']);

        return [
            'projects' => $projectRows,
            'models' => array_values($grouped),
        ];
    }

    /**
     * @return list<array{model: string, credits: int, turns: int, input_tokens: int, output_tokens: int}>
     */
    public static function byModel(): array
    {
        $rows = LabMessage::query()
            ->where('role', ChatRole::Assistant->value)
            ->whereNotNull('metadata')
            ->get(['metadata']);

        $grouped = [];

        foreach ($rows as $message) {
            $usage = is_array($message->metadata['usage'] ?? null) ? $message->metadata['usage'] : null;
            if ($usage === null) {
                continue;
            }

            $model = trim((string) ($usage['model'] ?? ''));
            if ($model === '') {
                $model = __('dashboard.Unknown');
            }

            $grouped[$model] ??= [
                'model' => $model,
                'credits' => 0,
                'turns' => 0,
                'input_tokens' => 0,
                'output_tokens' => 0,
            ];
            $grouped[$model]['credits'] += (int) ($usage['credits'] ?? 0);
            $grouped[$model]['turns']++;
            $grouped[$model]['input_tokens'] += (int) ($usage['input_tokens'] ?? 0);
            $grouped[$model]['output_tokens'] += (int) ($usage['output_tokens'] ?? 0);
        }

        return collect($grouped)
            ->sortByDesc('credits')
            ->values()
            ->all();
    }
}
