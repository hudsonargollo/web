<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\LabEventsRequest;
use App\Lab\LabProjectAccess;
use App\Models\LabProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Fire-and-forget Lab diagnostics → laravel.log (compact, no UI).
 */
class LabEventsController extends Controller
{
    public function __invoke(LabEventsRequest $request, LabProject $project): JsonResponse
    {
        LabProjectAccess::assertOwner($project, $request->user());

        $events = $request->input('events', []);
        if (! is_array($events)) {
            $events = [];
        }

        foreach ($events as $event) {
            if (! is_array($event)) {
                continue;
            }

            $type = trim((string) ($event['type'] ?? 'lab.client'));
            if ($type === '') {
                $type = 'lab.client';
            }

            // Flatten — one short JSON object per line, easy to rg.
            Log::info($type, array_filter([
                'project' => $project->uuid,
                'path' => $event['path'] ?? null,
                'status' => $event['status'] ?? null,
                'hint' => $event['hint'] ?? null,
                'errorClass' => $event['errorClass'] ?? null,
                'summary' => $event['summary'] ?? null,
                'gate' => data_get($event, 'artifacts.gate'),
                'errorType' => data_get($event, 'artifacts.errorType'),
                'message' => data_get($event, 'artifacts.message'),
                'line' => data_get($event, 'artifacts.line'),
                'column' => data_get($event, 'artifacts.column'),
                'contentBytes' => $event['contentBytes'] ?? null,
                'beforeBytes' => $event['beforeBytes'] ?? null,
                'contentHead' => $event['contentHead'] ?? null,
                'contentTail' => $event['contentTail'] ?? null,
                'fp' => $event['contentFingerprint'] ?? null,
            ], static fn ($v) => $v !== null && $v !== ''));
        }

        return response()->json([
            'ok' => true,
            'logged' => count($events),
        ]);
    }
}
