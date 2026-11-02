<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\RunBuildJob;
use App\Lab\Build\BuildException;
use App\Lab\Publish\LabPublicationManager;
use App\Lab\Publish\LabPublishConfig;
use App\Lab\SiteWorkspace;
use App\Models\Build;
use App\Models\LabProject;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Throwable;
use ZipArchive;

final class BuildController extends Controller
{
    public function __construct(
        private readonly LabPublicationManager $publications,
        private readonly LabPublishConfig $publishConfig,
        private readonly SiteWorkspace $workspace,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => ['required', 'in:site,proposal'],
            'title' => ['required', 'string', 'max:255'],
            'brief' => ['required', 'array'],
            'model' => ['nullable', 'string', 'max:64'],
        ]);

        $idempotencyKey = $request->header('Idempotency-Key');
        $idempotencyKey = is_string($idempotencyKey) ? trim($idempotencyKey) : '';

        if ($idempotencyKey !== '') {
            if (strlen($idempotencyKey) > 64) {
                return response()->json(['message' => 'Idempotency-Key must be 64 characters or fewer'], 422);
            }

            $existing = Build::query()->where('idempotency_key', $idempotencyKey)->first();

            if ($existing !== null) {
                return response()->json([
                    'id' => $existing->id,
                    'status' => $existing->status,
                    'poll_url' => '/api/v1/builds/'.$existing->id,
                ], 200);
            }
        }

        $build = Build::query()->create([
            'id' => Build::newId(),
            'kind' => $data['kind'],
            'title' => $data['title'],
            'brief' => $data['brief'],
            'model' => $data['model'] ?? null,
            'status' => Build::STATUS_QUEUED,
            'idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
        ]);

        RunBuildJob::dispatch($build->id);

        return response()->json([
            'id' => $build->id,
            'status' => $build->status,
            'poll_url' => '/api/v1/builds/'.$build->id,
        ], 202);
    }

    public function show(Build $build): JsonResponse
    {
        return response()->json($build->toApiArray());
    }

    public function publish(Request $request, Build $build): JsonResponse
    {
        $data = $request->validate([
            'subdomain' => ['required', 'string', 'max:63', 'regex:/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/'],
        ]);

        $slug = strtolower((string) $data['subdomain']);

        if (in_array($slug, $this->publishConfig->reservedSubdomains(), true)) {
            return response()->json(['message' => 'Subdomain is reserved'], 422);
        }

        if ($build->status === Build::STATUS_LIVE && $build->subdomain === $slug) {
            return response()->json($build->toApiArray(), 409);
        }

        if ($build->status !== Build::STATUS_READY) {
            return response()->json(['message' => 'Build is '.$build->status.', only ready builds can publish'], 409);
        }

        $taken = \App\Models\LabPublication::query()
            ->where('subdomain', $slug)
            ->where('lab_project_id', '!=', $build->lab_project_id)
            ->exists();

        if ($taken) {
            return response()->json(['message' => 'Subdomain is taken'], 422);
        }

        $build->forceFill(['status' => Build::STATUS_PUBLISHING])->save();

        $zipPath = null;

        try {
            $project = LabProject::query()->findOrFail($build->lab_project_id);
            $user = $this->serviceUser();

            $publication = $this->publications->forProject($project);
            $publication->forceFill([
                'kind' => 'subdomain',
                'subdomain' => $slug,
                'status' => 'building',
                'last_error' => null,
            ])->save();

            $zipPath = $this->zipWorkspace($project);
            $artifact = new UploadedFile($zipPath, $slug.'.zip', 'application/zip', null, true);
            $this->publications->deployArtifact($project, $user, $artifact);

            $build->forceFill([
                'status' => Build::STATUS_LIVE,
                'subdomain' => $slug,
                'live_url' => $this->publishConfig->subdomainUrl($slug),
                'error' => null,
                'finished_at' => now(),
            ])->save();
        } catch (Throwable $e) {
            report($e);

            $build->forceFill([
                'status' => Build::STATUS_FAILED,
                'error' => mb_substr($e->getMessage(), 0, 2000),
            ])->save();

            return response()->json(['message' => 'Publish failed: '.$e->getMessage()], 500);
        } finally {
            if ($zipPath !== null && is_file($zipPath)) {
                @unlink($zipPath);
            }
        }

        return response()->json($build->refresh()->toApiArray(), 202);
    }

    public function destroy(Build $build): JsonResponse
    {
        $project = $build->lab_project_id !== null
            ? LabProject::query()->find($build->lab_project_id)
            : null;

        if ($project instanceof LabProject) {
            try {
                $this->publications->unpublish($project, $this->serviceUser());
            } catch (Throwable $e) {
                report($e);
            }

            $this->workspace->forget($project);
            File::deleteDirectory(storage_path('app/lab/live/'.$project->uuid));
        }

        $build->delete();

        return response()->json(null, 204);
    }

    private function zipWorkspace(LabProject $project): string
    {
        $root = $this->workspace->root($project);
        $zipPath = tempnam(sys_get_temp_dir(), 'krikkit-build-');

        if ($zipPath === false) {
            throw new BuildException('Could not allocate a temporary archive');
        }

        $zip = new ZipArchive();

        if ($zip->open($zipPath, ZipArchive::OVERWRITE) !== true) {
            throw new BuildException('Could not open the temporary archive');
        }

        $added = 0;

        foreach (File::allFiles($root) as $file) {
            $relative = str_replace('\\', '/', $file->getRelativePathname());

            if (str_starts_with($relative, '.krikkit-kit')) {
                continue;
            }

            $zip->addFile($file->getPathname(), $relative);
            $added++;
        }

        $zip->close();

        if ($added === 0) {
            @unlink($zipPath);

            throw new BuildException('Workspace is empty, nothing to publish');
        }

        return $zipPath;
    }

    private function serviceUser(): User
    {
        $id = (int) config('krikkit.build.service_user_id');
        $user = $id > 0 ? User::query()->find($id) : null;

        if (! $user instanceof User) {
            throw new BuildException('KRIKKIT_BUILD_SERVICE_USER_ID does not resolve to a user');
        }

        return $user;
    }
}
