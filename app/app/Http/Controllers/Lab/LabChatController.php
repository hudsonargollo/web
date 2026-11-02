<?php

namespace App\Http\Controllers\Lab;

use App\Ai\ChatGateway;
use App\Ai\Data\AgentStage;
use App\Ai\Data\ChatMessage;
use App\Ai\Data\ChatResponse;
use App\Ai\Data\ChatRole;
use App\Ai\Exceptions\AiException;
use App\Ai\Exceptions\ProviderException;
use App\Ai\Exceptions\UnknownModelException;
use App\Ai\Lab\AutoRepairPrompt;
use App\Ai\Lab\LabProjectRecorder;
use App\Ai\Lab\PreviewEditPrompt;
use App\Ai\Lab\ProjectTitler;
use App\Ai\Lab\ProjectVisualIdentity;
use App\Ai\ModelCatalog;
use App\Entitlement\EntitlementCatalog;
use App\Entitlement\EntitlementGate;
use App\Entitlement\LabCreditMeter;
use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\LabChatRequest;
use App\Models\LabProject;
use App\Support\ConstrainedUuid;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class LabChatController extends Controller
{
    public function __invoke(
        LabChatRequest $request,
        ChatGateway $gateway,
        ModelCatalog $catalog,
        LabProjectRecorder $recorder,
        EntitlementGate $entitlements,
        LabCreditMeter $credits,
        ProjectTitler $titler,
    ): JsonResponse|StreamedResponse {
        $modelId = $request->string('model')->toString() ?: $catalog->defaultId();

        $messages = [];
        foreach ($request->input('messages', []) as $row) {
            $role = ChatRole::from((string) $row['role']);
            $messages[] = new ChatMessage($role, (string) $row['content']);
        }

        $autoRepairInput = $request->input('auto_repair');
        $autoRepair = is_array($autoRepairInput) && ($autoRepairInput['type'] ?? null) === 'AUTO_REPAIR'
            ? AutoRepairPrompt::normalize($autoRepairInput)
            : null;

        // LLM sees the full SYSTEM AUTO-REPAIR payload; chat UI never stores that dump.
        $llmMessages = $messages;
        if ($autoRepair !== null) {
            $prompt = AutoRepairPrompt::format($autoRepair);
            for ($i = count($llmMessages) - 1; $i >= 0; $i--) {
                if ($llmMessages[$i]->role === ChatRole::User) {
                    $llmMessages[$i] = new ChatMessage(ChatRole::User, $prompt);
                    break;
                }
            }
            // Keep persisted user content short + metadata-backed.
            for ($i = count($messages) - 1; $i >= 0; $i--) {
                if ($messages[$i]->role === ChatRole::User) {
                    $messages[$i] = new ChatMessage(
                        ChatRole::User,
                        AutoRepairPrompt::displayContent($autoRepair),
                    );
                    break;
                }
            }
        }

        $previewEditsInput = $request->input('preview_edits');
        $previewEdits = is_array($previewEditsInput) && $previewEditsInput !== []
            ? PreviewEditPrompt::normalize($previewEditsInput)
            : [];
        if ($autoRepair === null && $previewEdits !== []) {
            $userText = '';
            for ($i = count($messages) - 1; $i >= 0; $i--) {
                if ($messages[$i]->role === ChatRole::User) {
                    $userText = $messages[$i]->content;
                    break;
                }
            }
            $suffix = PreviewEditPrompt::format($previewEdits, $userText);
            $llmBody = trim($userText) === '' ? $suffix : trim($userText)."\n\n".$suffix;
            for ($i = count($llmMessages) - 1; $i >= 0; $i--) {
                if ($llmMessages[$i]->role === ChatRole::User) {
                    $llmMessages[$i] = new ChatMessage(ChatRole::User, $llmBody);
                    break;
                }
            }
        }

        $stage = AgentStage::tryFrom((string) $request->input('stage', ''));
        $contextPack = $request->input('context_pack');
        $tools = $request->input('tools');
        $toolChoice = $request->input('tool_choice');

        $user = $request->user();
        $projectUuid = $request->input('project');
        $mintingProject = blank($projectUuid)
            || LabProject::query()->where('uuid', $projectUuid)->doesntExist();
        $identityUuid = filled($projectUuid)
            ? (string) $projectUuid
            : ConstrainedUuid::v4();
        $contextPack = ProjectVisualIdentity::attachToPack(
            is_array($contextPack) ? $contextPack : null,
            $identityUuid,
        );

        $existingProject = filled($projectUuid)
            ? LabProject::query()->where('uuid', $projectUuid)->first()
            : null;
        $needsTitle = $mintingProject
            || ($existingProject !== null && $titler->isPlaceholder((string) $existingProject->title));

        $productName = null;
        if ($needsTitle) {
            $productName = $titler->name($this->bestUserBrief($messages));
            $pack = is_array($contextPack['pack'] ?? null) ? $contextPack['pack'] : [];
            $session = is_array($pack['session'] ?? null) ? $pack['session'] : [];
            $session['projectTitle'] = $productName;
            $pack['session'] = $session;
            $contextPack['pack'] = $pack;
        }

        if ($mintingProject) {
            $entitlements->assertQuota($user, EntitlementCatalog::PROJECTS);
        }

        $entitlements->assertQuota($user, EntitlementCatalog::LAB_CREDITS);

        $gatewayArgs = [
            'modelId' => $modelId,
            'messages' => $llmMessages,
            'promptKey' => 'lab',
            'stage' => $stage,
            'contextPack' => is_array($contextPack) ? $contextPack : null,
            'tools' => is_array($tools) ? $tools : null,
            'toolChoice' => $toolChoice,
        ];

        if (self::wantsStream($request)) {
            return $this->streamTurn(
                request: $request,
                gateway: $gateway,
                recorder: $recorder,
                entitlements: $entitlements,
                credits: $credits,
                identityUuid: $identityUuid,
                messages: $messages,
                autoRepair: $autoRepair,
                previewEdits: $previewEdits,
                stage: $stage,
                gatewayArgs: $gatewayArgs,
                productName: $productName,
            );
        }

        try {
            $response = $gateway->complete(
                modelId: $gatewayArgs['modelId'],
                messages: $gatewayArgs['messages'],
                promptKey: $gatewayArgs['promptKey'],
                stage: $gatewayArgs['stage'],
                contextPack: $gatewayArgs['contextPack'],
                tools: $gatewayArgs['tools'],
                toolChoice: $gatewayArgs['toolChoice'],
            );
        } catch (UnknownModelException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (ProviderException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'provider' => $e->provider,
            ], $e->status && $e->status >= 400 && $e->status < 600 ? $e->status : 502);
        } catch (AiException $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        } catch (Throwable $e) {
            report($e);

            $message = config('app.debug')
                ? $e->getMessage()
                : 'Chat request failed.';

            return response()->json(['message' => $message], 500);
        }

        return response()->json($this->presentTurn(
            request: $request,
            response: $response,
            recorder: $recorder,
            entitlements: $entitlements,
            credits: $credits,
            identityUuid: $identityUuid,
            messages: $messages,
            autoRepair: $autoRepair,
            previewEdits: $previewEdits,
            stage: $stage,
            productName: $productName,
        ));
    }

    private static function wantsStream(LabChatRequest $request): bool
    {
        if ($request->boolean('stream')) {
            return true;
        }

        return str_contains(strtolower((string) $request->header('Accept')), 'text/event-stream');
    }

    /**
     * @param  list<ChatMessage>  $messages
     * @param  array<string, mixed>|null  $autoRepair
     * @param  list<array<string, mixed>>  $previewEdits
     * @param  array<string, mixed>  $gatewayArgs
     */
    private function streamTurn(
        LabChatRequest $request,
        ChatGateway $gateway,
        LabProjectRecorder $recorder,
        EntitlementGate $entitlements,
        LabCreditMeter $credits,
        string $identityUuid,
        array $messages,
        ?array $autoRepair,
        array $previewEdits,
        ?AgentStage $stage,
        array $gatewayArgs,
        ?string $productName = null,
    ): StreamedResponse {
        return response()->stream(function () use (
            $request,
            $gateway,
            $recorder,
            $entitlements,
            $credits,
            $identityUuid,
            $messages,
            $autoRepair,
            $previewEdits,
            $stage,
            $gatewayArgs,
            $productName,
        ): void {
            if (! app()->runningUnitTests()) {
                if (function_exists('ini_set')) {
                    @ini_set('output_buffering', 'off');
                    @ini_set('zlib.output_compression', '0');
                }
                while (ob_get_level() > 0) {
                    @ob_end_flush();
                }
                ob_implicit_flush(true);
            }
            @set_time_limit(0);

            // Push bytes before the provider call so the browser leaves
            // "Waiting for model" immediately — PHP/FastCGI otherwise hold
            // the first token until the whole Anthropic stream closes.
            self::kickSse();
            self::emitSse('status', [
                'label' => self::streamStatusLabel($stage, $autoRepair),
            ]);

            try {
                $response = $gateway->stream(
                    modelId: $gatewayArgs['modelId'],
                    messages: $gatewayArgs['messages'],
                    onEvent: function (array $event): void {
                        $type = (string) ($event['type'] ?? '');
                        if ($type === 'thought') {
                            self::emitSse('thought', ['text' => (string) ($event['text'] ?? '')]);
                        }
                        if ($type === 'text') {
                            self::emitSse('text', [
                                'text' => (string) ($event['text'] ?? ''),
                                'propose_workspace' => (bool) ($event['propose_workspace'] ?? false),
                            ]);
                        }
                        if ($type === 'tool_start' || $type === 'tool_end') {
                            $call = is_array($event['call'] ?? null) ? $event['call'] : [];
                            self::emitSse($type, [
                                'id' => (string) ($call['id'] ?? ''),
                                'name' => (string) ($call['name'] ?? ''),
                                'arguments' => is_array($call['arguments'] ?? null) ? $call['arguments'] : [],
                            ]);
                        }
                    },
                    promptKey: $gatewayArgs['promptKey'],
                    stage: $gatewayArgs['stage'],
                    contextPack: $gatewayArgs['contextPack'],
                    tools: $gatewayArgs['tools'],
                    toolChoice: $gatewayArgs['toolChoice'],
                );
            } catch (UnknownModelException $e) {
                self::emitSse('error', ['message' => $e->getMessage(), 'status' => 422]);

                return;
            } catch (ProviderException $e) {
                self::emitSse('error', [
                    'message' => $e->getMessage(),
                    'provider' => $e->provider,
                    'status' => $e->status && $e->status >= 400 && $e->status < 600 ? $e->status : 502,
                ]);

                return;
            } catch (AiException $e) {
                self::emitSse('error', ['message' => $e->getMessage(), 'status' => 500]);

                return;
            } catch (Throwable $e) {
                report($e);
                self::emitSse('error', [
                    'message' => config('app.debug') ? $e->getMessage() : 'Chat request failed.',
                    'status' => 500,
                ]);

                return;
            }

            self::emitSse('done', $this->presentTurn(
                request: $request,
                response: $response,
                recorder: $recorder,
                entitlements: $entitlements,
                credits: $credits,
                identityUuid: $identityUuid,
                messages: $messages,
                autoRepair: $autoRepair,
                previewEdits: $previewEdits,
                stage: $stage,
                productName: $productName,
            ));
        }, 200, [
            'Content-Type' => 'text/event-stream; charset=utf-8',
            'Cache-Control' => 'no-cache, no-transform',
            'Content-Encoding' => 'identity',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $autoRepair
     */
    private static function streamStatusLabel(?AgentStage $stage, ?array $autoRepair): string
    {
        if ($autoRepair !== null) {
            return 'Repairing…';
        }

        return 'Waiting for model…';
    }

    /**
     * Fill PHP/FastCGI 4 KiB buffers so the first event reaches the browser
     * before the provider finishes. SSE comments are ignored by the client.
     */
    private static function kickSse(): void
    {
        echo ':'.str_repeat(' ', 4096)."\n\n";
        self::flushSse();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function emitSse(string $event, array $data): void
    {
        echo 'event: '.$event."\n";
        echo 'data: '.json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n\n";
        self::flushSse();
    }

    private static function flushSse(): void
    {
        if (ob_get_level() > 0) {
            @ob_flush();
        }
        flush();
    }

    /**
     * @param  list<ChatMessage>  $messages
     * @param  array<string, mixed>|null  $autoRepair
     * @param  list<array<string, mixed>>  $previewEdits
     * @return array<string, mixed>
     */
    private function presentTurn(
        LabChatRequest $request,
        ChatResponse $response,
        LabProjectRecorder $recorder,
        EntitlementGate $entitlements,
        LabCreditMeter $credits,
        string $identityUuid,
        array $messages,
        ?array $autoRepair,
        array $previewEdits,
        ?AgentStage $stage,
        ?string $productName = null,
    ): array {
        $usage = is_array($response->meta['usage'] ?? null) ? $response->meta['usage'] : [];
        $charged = $credits->quote($usage, $response->modelId, $response->toolCalls);
        $user = $request->user();
        $entitlements->settle($user, EntitlementCatalog::LAB_CREDITS, $charged);
        $creditState = $entitlements->creditSnapshot($user);

        $thought = $response->meta['thought'] ?? null;
        $suggestions = $response->meta['suggestions'] ?? [];
        $todos = $response->meta['todos'] ?? [];
        $recorded = $recorder->sync(
            projectUuid: $identityUuid,
            messages: $messages,
            assistantContent: $response->content,
            user: $request->user(),
            persistUser: $request->boolean('persist_user', true),
            persistAssistant: $request->boolean('persist_assistant', true),
            thought: is_string($thought) ? $thought : null,
            userMetadata: self::userMetadata($autoRepair, $previewEdits),
            usage: [
                'model' => $response->modelId,
                'credits' => $charged,
                'input_tokens' => (int) ($usage['input_tokens'] ?? 0),
                'output_tokens' => (int) ($usage['output_tokens'] ?? 0),
            ],
            title: $productName,
        );
        $project = $recorded['project'];
        $project->recordCreditSpend($charged);
        $assistantMessageId = $recorded['assistant_message_id'];

        return [
            'content' => $response->content,
            'model' => $response->modelId,
            'provider' => $response->provider,
            'stage' => $response->meta['stage'] ?? $stage?->value,
            'propose_workspace' => (bool) ($response->meta['propose_workspace'] ?? false),
            'thought' => $response->meta['thought'] ?? null,
            'suggestions' => is_array($suggestions) ? array_values($suggestions) : [],
            'todos' => is_array($todos) ? array_values($todos) : [],
            'tool_calls' => $response->toolCallsPayload(),
            'tools_offered' => (bool) ($response->meta['tools_offered'] ?? false),
            'tool_choice' => $response->meta['tool_choice'] ?? null,
            'pseudo_tools_recovered' => (bool) ($response->meta['pseudo_tools_recovered'] ?? false),
            'assistant_message_id' => $assistantMessageId,
            'usage' => $usage,
            'credits' => [
                'charged' => $charged,
                ...(is_array($creditState) ? $creditState : []),
            ],
            'finish_reason' => $response->meta['finish_reason']
                ?? $response->meta['stop_reason']
                ?? null,
            'project' => [
                'uuid' => $project->uuid,
                'title' => $project->title,
                'notes' => $project->notes,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>|null  $autoRepair
     * @param  list<array<string, mixed>>  $previewEdits
     * @return array<string, mixed>|null
     */
    private static function userMetadata(?array $autoRepair, array $previewEdits): ?array
    {
        $meta = [];
        if ($autoRepair !== null) {
            $meta['autoRepair'] = $autoRepair;
        }
        if ($previewEdits !== []) {
            $meta['previewEdits'] = $previewEdits;
        }

        return $meta === [] ? null : $meta;
    }

    /**
     * @param  list<ChatMessage>  $messages
     */
    /**
     * Longest user line — usually the product brief, not a short follow-up.
     *
     * @param  list<ChatMessage>  $messages
     */
    private function bestUserBrief(array $messages): string
    {
        $best = '';

        foreach ($messages as $message) {
            if ($message->role !== ChatRole::User) {
                continue;
            }
            $text = trim($message->content);
            if ($text !== '' && mb_strlen($text) > mb_strlen($best)) {
                $best = $text;
            }
        }

        return $best;
    }
}
