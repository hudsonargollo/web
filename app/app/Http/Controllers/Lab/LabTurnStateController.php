<?php

namespace App\Http\Controllers\Lab;

use App\Ai\Data\ChatRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\LabTurnStateRequest;
use App\Lab\LabProjectAccess;
use App\Models\LabMessage;
use App\Models\LabProject;
use Illuminate\Http\JsonResponse;

/**
 * Persists rich Lab turn chrome (thinking, tool cards, checklist) onto a
 * specific assistant message (or the latest assistant when message_id is omitted).
 */
class LabTurnStateController extends Controller
{
    public function __invoke(LabTurnStateRequest $request, LabProject $project): JsonResponse
    {
        LabProjectAccess::assertWritable($project, $request->user());

        /** @var LabMessage|null $message */
        $messageId = $request->integer('message_id') ?: null;

        if ($messageId) {
            $message = $project->messages()
                ->where('role', ChatRole::Assistant->value)
                ->whereKey($messageId)
                ->first();
        } else {
            // Prefer the last assistant with visible text (discovery / build prose).
            // Empty tool-loop rows must not steal chrome on F5.
            $message = $project->messages()
                ->where('role', ChatRole::Assistant->value)
                ->whereRaw('LENGTH(TRIM(content)) > 0')
                ->orderByDesc('id')
                ->first();

            if ($message === null) {
                $message = $project->messages()
                    ->where('role', ChatRole::Assistant->value)
                    ->orderByDesc('id')
                    ->first();
            }
        }

        if ($message === null) {
            return response()->json(['message' => 'No assistant turn to update.'], 404);
        }

        $incoming = $request->input('metadata', []);
        if (! is_array($incoming)) {
            $incoming = [];
        }

        $merged = is_array($message->metadata) ? $message->metadata : [];

        // Null means "omit" — never wipe existing tool chrome with an empty persist.
        // Empty string / false on wait keys clears a leftover in-progress label.
        foreach ($incoming as $key => $value) {
            if (in_array($key, ['turnStatus', 'waitStartedAt'], true)
                && ($value === '' || $value === false || $value === null)
            ) {
                unset($merged[$key]);

                continue;
            }
            if ($value === null) {
                continue;
            }
            $merged[$key] = $value;
        }

        $message->metadata = $merged === [] ? null : $merged;

        if ($request->filled('content')) {
            $message->content = (string) $request->input('content');
        }

        $message->save();

        return response()->json([
            'ok' => true,
            'message_id' => $message->id,
            'project' => [
                'uuid' => $project->uuid,
            ],
        ]);
    }
}
