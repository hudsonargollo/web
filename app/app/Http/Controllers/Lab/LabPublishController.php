<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\LabPublishArtifactRequest;
use App\Http\Requests\Lab\LabPublishRequest;
use App\Lab\LabProjectAccess;
use App\Lab\Publish\LabPublicationManager;
use App\Lab\Publish\LabPublishConfig;
use App\Models\LabProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class LabPublishController extends Controller
{
    public function show(Request $request, LabProject $project, LabPublicationManager $manager): JsonResponse
    {
        LabProjectAccess::assertOwner($project, $request->user());

        return response()->json($manager->payload($project, $request->user()));
    }

    public function update(
        LabPublishRequest $request,
        LabProject $project,
        LabPublicationManager $manager,
    ): JsonResponse {
        if ($denied = $this->deniedUnlessPublishingEnabled()) {
            return $denied;
        }

        try {
            $payload = $manager->saveAndPublish($project, $request->user(), $request->validated());
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($payload);
    }

    public function verify(Request $request, LabProject $project, LabPublicationManager $manager): JsonResponse
    {
        LabProjectAccess::assertOwner($project, $request->user());

        if ($denied = $this->deniedUnlessPublishingEnabled()) {
            return $denied;
        }

        try {
            $payload = $manager->verifyCustomHost($project, $request->user());
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($payload);
    }

    public function destroy(Request $request, LabProject $project, LabPublicationManager $manager): JsonResponse
    {
        LabProjectAccess::assertOwner($project, $request->user());

        return response()->json($manager->unpublish($project, $request->user()));
    }

    public function storeArtifact(
        LabPublishArtifactRequest $request,
        LabProject $project,
        LabPublicationManager $manager,
    ): JsonResponse {
        if ($denied = $this->deniedUnlessPublishingEnabled()) {
            return $denied;
        }

        try {
            $payload = $manager->deployArtifact($project, $request->user(), $request->file('artifact'));
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($payload);
    }

    private function deniedUnlessPublishingEnabled(): ?JsonResponse
    {
        if (app(LabPublishConfig::class)->enabled()) {
            return null;
        }

        return response()->json(['message' => __('dashboard.Publishing is turned off.')], 403);
    }
}
