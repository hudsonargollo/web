<?php

namespace App\Http\Controllers\Lab;

use App\Datastore\DatastoreKind;
use App\Datastore\DatastoreRevisor;
use App\Datastore\DatastoreSurveyor;
use App\Datastore\Lenses\SupabaseLens;
use App\Datastore\SupabaseCloud;
use App\Datastore\SupabaseLinkBroker;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

class LabDatastoreController extends Controller
{
    public function status(Request $request, SupabaseLinkBroker $broker): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        return response()->json($broker->statusFor($user));
    }

    public function projects(Request $request, SupabaseLinkBroker $broker): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            return response()->json(['projects' => $broker->projectsFor($user)]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function attach(Request $request, SupabaseLinkBroker $broker): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $ref = trim((string) $request->input('project_ref', ''));
        if ($ref === '') {
            return response()->json(['message' => 'A project is required.'], 422);
        }

        try {
            $broker->attachProject($user, $ref);
        } catch (InvalidArgumentException|RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($broker->statusFor($user));
    }

    public function unlink(Request $request, SupabaseLinkBroker $broker): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $broker->unlink($user);

        return response()->json($broker->statusFor($user));
    }

    public function survey(Request $request, DatastoreSurveyor $surveyor): JsonResponse
    {
        return response()->json($surveyor->survey(
            DatastoreKind::SUPABASE,
            $request->boolean('fresh'),
            $request->user(),
        ));
    }

    public function revise(Request $request, DatastoreRevisor $revisor): JsonResponse
    {
        $sql = trim((string) $request->input('sql', ''));
        if ($sql === '' || mb_strlen($sql) > 40_000) {
            return response()->json(['message' => 'SQL is required (max 40 000 characters).'], 422);
        }

        $payload = $revisor->revise(
            sql: $sql,
            acknowledgeDestructive: $request->boolean('acknowledge_destructive'),
            kind: DatastoreKind::SUPABASE,
            user: $request->user(),
        );

        $status = $payload['ok'] ? 200 : (($payload['needs_ack'] ?? false) ? 409 : 422);

        return response()->json($payload, $status);
    }

    public function records(
        Request $request,
        SupabaseLinkBroker $broker,
        DatastoreSurveyor $surveyor,
        SupabaseLens $lens,
    ): JsonResponse {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $validated = $request->validate([
            'table' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z_][A-Za-z0-9_]*$/'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $plane = $broker->planeFor($user);
        if (! $plane['ready']) {
            return response()->json(['message' => 'No data plane is attached.'], 422);
        }

        $survey = $surveyor->survey(DatastoreKind::SUPABASE, false, $user);
        $names = [];
        foreach (is_array($survey['tables'] ?? null) ? $survey['tables'] : [] as $row) {
            if (is_array($row) && filled($row['name'] ?? null)) {
                $names[] = (string) $row['name'];
            }
        }

        $table = $validated['table'];
        if (! in_array($table, $names, true)) {
            return response()->json(['message' => 'Unknown table.'], 404);
        }

        $payload = $lens->rows($plane, $table, (int) ($validated['limit'] ?? 50));
        $status = ($payload['ok'] ?? false) ? 200 : 422;

        return response()->json($payload, $status);
    }

    public function auth(Request $request, SupabaseCloud $cloud): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            return response()->json($cloud->authConfig($user));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function saveAuth(Request $request, SupabaseCloud $cloud): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $validated = $request->validate([
            'allow_signup' => ['sometimes', 'boolean'],
            'allow_anonymous' => ['sometimes', 'boolean'],
            'email_password' => ['sometimes', 'boolean'],
            'google' => ['sometimes', 'boolean'],
        ]);

        try {
            return response()->json($cloud->saveAuth($user, $validated));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function users(Request $request, SupabaseCloud $cloud): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $q = trim((string) $request->query('q', ''));

        try {
            return response()->json($cloud->users($user, $q));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function addUser(Request $request, SupabaseCloud $cloud): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:180'],
            'password' => ['nullable', 'string', 'min:8', 'max:120'],
            'invite' => ['sometimes', 'boolean'],
        ]);

        try {
            return response()->json($cloud->addUser(
                $user,
                $validated['email'],
                $validated['password'] ?? null,
                (bool) ($validated['invite'] ?? false),
            ), 201);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function restart(Request $request, SupabaseCloud $cloud): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        try {
            $cloud->restart($user);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['ok' => true]);
    }

    public function catalog(Request $request, SupabaseCloud $cloud): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $validated = $request->validate([
            'topic' => ['required', 'string', 'in:security,functions,storage,secrets,logs,advanced'],
        ]);

        try {
            return response()->json($cloud->catalog($user, $validated['topic']));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
