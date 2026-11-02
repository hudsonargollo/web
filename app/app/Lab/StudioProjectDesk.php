<?php

namespace App\Lab;

use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Entitlement\Exceptions\EntitlementDeniedException;
use App\Models\LabMessage;
use App\Models\LabProject;
use App\Models\User;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Studio project actions (rename, duplicate, star, delete, export).
 */
final class StudioProjectDesk
{
    public function __construct(
        private readonly SiteWorkspace $workspace,
        private readonly EntitlementGate $entitlements,
    ) {}

    public function owned(User $user, string $uuid): LabProject
    {
        $project = LabProject::query()->where('uuid', $uuid)->firstOrFail();
        LabProjectAccess::assertOwner($project, $user);

        return $project;
    }

    public function toggleStar(User $user, string $uuid): LabProject
    {
        $project = $this->owned($user, $uuid);
        $project->forceFill([
            'starred_at' => $project->starred_at === null ? now() : null,
        ])->save();

        return $project->fresh();
    }

    public function rename(User $user, string $uuid, string $title): LabProject
    {
        $project = $this->owned($user, $uuid);
        LabProjectAccess::assertWritable($project, $user);
        $project->forceFill(['title' => $title])->save();

        return $project->fresh();
    }

    public function duplicate(User $user, string $uuid): LabProject
    {
        $source = $this->owned($user, $uuid);
        $this->entitlements->assertQuota($user, EntitlementCatalog::PROJECTS);

        $copy = LabProject::query()->create([
            'title' => $this->duplicatedTitle($source->title),
            'notes' => $source->notes,
            'user_id' => $user->id,
            'kit_version' => $source->kit_version,
            'stack' => $source->stack,
            'workspace_status' => $source->workspace_status,
        ]);

        foreach ($source->messages as $message) {
            LabMessage::query()->create([
                'lab_project_id' => $copy->id,
                'role' => $message->role,
                'content' => $message->content,
                'metadata' => $message->metadata,
            ]);
        }

        $this->workspace->cloneDisk($source, $copy);

        return $copy;
    }

    public function delete(User $user, string $uuid): void
    {
        $project = $this->owned($user, $uuid);
        $this->workspace->forget($project);
        $project->messages()->delete();
        $project->delete();
    }

    public function exportZip(User $user, LabProject $project): BinaryFileResponse
    {
        LabProjectAccess::assertOwner($project, $user);

        try {
            $this->entitlements->assertFeature($user, EntitlementCatalog::ADVANCED_EXPORT);
        } catch (EntitlementDeniedException $denied) {
            abort(EntitlementDeniedException::HTTP_STATUS, $denied->getMessage());
        }

        $path = $this->workspace->archive($project);
        $name = $this->archiveName($project);

        return response()
            ->download($path, $name, [
                'Content-Type' => 'application/zip',
            ])
            ->deleteFileAfterSend(true);
    }

    private function duplicatedTitle(?string $title): string
    {
        $base = trim((string) $title);

        if ($base === '') {
            $base = __('studio.Untitled');
        }

        return $base.' (duplicated)';
    }

    private function archiveName(LabProject $project): string
    {
        $slug = Str::slug((string) ($project->title ?: 'project'));

        if ($slug === '') {
            $slug = 'project';
        }

        return $slug.'.zip';
    }
}
