<?php

namespace App\Ai;

use App\Ai\Contracts\ChatDriver;
use App\Ai\Contracts\StreamableChatDriver;
use App\Ai\Data\AgentStage;
use App\Ai\Data\ChatMessage;
use App\Ai\Data\ChatRequest;
use App\Ai\Data\ChatResponse;
use App\Ai\Data\ModelDefinition;
use App\Ai\Lab\LabBuildPolicy;
use App\Ai\Lab\LabToolCatalog;
use App\Ai\Lab\PseudoToolCallParser;
use App\Ai\Lab\StageContextContract;
use App\Ai\Lab\SuggestionsParser;
use App\Ai\Lab\ThoughtBlockParser;
use App\Ai\Lab\TodosParser;
use App\Ai\Lab\WorkspaceProposalParser;
use App\Ai\Support\ConversationPruner;
use App\Ai\Support\ProviderToolSupport;
use App\Ai\Support\UsageNormalizer;
use Illuminate\Support\Facades\Log;

/**
 * Single entry for chat completions (+ staged agent / tool-calling).
 *
 * Flow: prompt key (shared) + model id → optional stage ContextPack inject →
 * optional native tools → resolve provider → driver complete/stream → readiness parse.
 */
final class ChatGateway
{
    public function __construct(
        private readonly ModelCatalog $catalog,
        private readonly ProviderFactory $providers,
        private readonly PromptStore $prompts,
        private readonly StageContextContract $stageContext = new StageContextContract,
        private readonly LabToolCatalog $toolCatalog = new LabToolCatalog,
        private readonly WorkspaceProposalParser $workspaceProposal = new WorkspaceProposalParser,
        private readonly ThoughtBlockParser $thoughtBlock = new ThoughtBlockParser,
        private readonly SuggestionsParser $suggestions = new SuggestionsParser,
        private readonly TodosParser $todos = new TodosParser,
        private readonly PseudoToolCallParser $pseudoTools = new PseudoToolCallParser,
        private readonly ConversationPruner $conversationPruner = new ConversationPruner,
    ) {}

    /**
     * @param  list<ChatMessage>  $messages
     * @param  array<string, mixed>  $options
     * @param  array<string, mixed>|null  $contextPack  Client StageContextContract payload
     * @param  list<array<string, mixed>>|null  $tools  Override tool defs (null = Lab catalog when stage=executor)
     */
    public function complete(
        string $modelId,
        array $messages,
        string $promptKey = 'lab',
        array $options = [],
        ?AgentStage $stage = null,
        ?array $contextPack = null,
        ?array $tools = null,
        string|array|null $toolChoice = null,
    ): ChatResponse {
        $prepared = $this->prepareTurn(
            $modelId,
            $messages,
            $promptKey,
            $options,
            $stage,
            $contextPack,
            $tools,
            $toolChoice,
        );

        return $this->finalizeTurn($prepared['driver']->complete($prepared['request']), $prepared);
    }

    /**
     * Same as complete(), but forwards thought / tool_start events while the provider body is open.
     *
     * @param  list<ChatMessage>  $messages
     * @param  array<string, mixed>  $options
     * @param  array<string, mixed>|null  $contextPack
     * @param  list<array<string, mixed>>|null  $tools
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    public function stream(
        string $modelId,
        array $messages,
        callable $onEvent,
        string $promptKey = 'lab',
        array $options = [],
        ?AgentStage $stage = null,
        ?array $contextPack = null,
        ?array $tools = null,
        string|array|null $toolChoice = null,
    ): ChatResponse {
        $prepared = $this->prepareTurn(
            $modelId,
            $messages,
            $promptKey,
            $options,
            $stage,
            $contextPack,
            $tools,
            $toolChoice,
        );

        $driver = $prepared['driver'];
        $acc = '';
        $lastThought = '';
        $lastThoughtEmit = 0.0;
        $lastVisible = '';
        $lastVisibleEmit = 0.0;
        $forward = function (array $event) use ($onEvent, &$acc, &$lastThought, &$lastThoughtEmit, &$lastVisible, &$lastVisibleEmit): void {
            if (($event['type'] ?? '') === 'text_delta') {
                $delta = (string) ($event['text'] ?? '');
                $acc .= $delta;

                // Thought + visible reply share the same provider stream.
                // After </thought> the visible half used to stay buffered
                // until HTTP close — the UI sat on "Waiting for model"
                // while the model was already writing the Switch copy.
                $now = microtime(true);
                $closing = str_contains($delta, '</') || str_contains($delta, 'KRIKKIT_META');
                $parsed = $this->thoughtBlock->parse($acc);
                $thought = $parsed['thought'];
                $proposal = $this->workspaceProposal->parse((string) ($parsed['content'] ?? ''));
                $visible = (string) ($proposal['content'] ?? '');

                if (is_string($thought) && $thought !== '' && $thought !== $lastThought) {
                    if ($closing || ($now - $lastThoughtEmit) >= 0.09) {
                        $lastThought = $thought;
                        $lastThoughtEmit = $now;
                        $onEvent(['type' => 'thought', 'text' => $thought]);
                    }
                }

                if ($visible !== '' && $visible !== $lastVisible) {
                    if ($closing || ($now - $lastVisibleEmit) >= 0.09) {
                        $lastVisible = $visible;
                        $lastVisibleEmit = $now;
                        $onEvent([
                            'type' => 'text',
                            'text' => $visible,
                            'propose_workspace' => (bool) ($proposal['propose_workspace'] ?? false),
                        ]);
                    }
                }

                return;
            }
            $type = $event['type'] ?? '';
            if ($type === 'tool_start' || $type === 'tool_end') {
                $onEvent($event);
            }
        };

        $raw = $driver instanceof StreamableChatDriver
            ? $driver->stream($prepared['request'], $forward)
            : $driver->complete($prepared['request']);

        // Flush thought/text held by the 90ms throttle once the provider
        // stream ends (last delta otherwise waits for HTTP close).
        $parsed = $this->thoughtBlock->parse($acc);
        $thought = $parsed['thought'];
        $proposal = $this->workspaceProposal->parse((string) ($parsed['content'] ?? ''));
        $visible = (string) ($proposal['content'] ?? '');
        if (is_string($thought) && $thought !== '' && $thought !== $lastThought) {
            $onEvent(['type' => 'thought', 'text' => $thought]);
        }
        if ($visible !== '' && $visible !== $lastVisible) {
            $onEvent([
                'type' => 'text',
                'text' => $visible,
                'propose_workspace' => (bool) ($proposal['propose_workspace'] ?? false),
            ]);
        }

        return $this->finalizeTurn($raw, $prepared);
    }

    /**
     * @param  list<ChatMessage>  $messages
     * @param  array<string, mixed>  $options
     * @param  array<string, mixed>|null  $contextPack
     * @param  list<array<string, mixed>>|null  $tools
     * @return array{
     *     driver: ChatDriver,
     *     request: ChatRequest,
     *     model: ModelDefinition,
     *     resolvedStage: ?AgentStage,
     *     resolvedTools: array,
     *     toolChoice: mixed,
     *     contextPack: ?array
     * }
     */
    private function prepareTurn(
        string $modelId,
        array $messages,
        string $promptKey,
        array $options,
        ?AgentStage $stage,
        ?array $contextPack,
        ?array $tools,
        string|array|null $toolChoice,
    ): array {
        $model = $this->catalog->get($modelId);
        $systemStable = $this->prompts->get($promptKey);
        $systemRules = '';
        $systemBaseline = '';
        $systemDynamic = '';
        $driver = $this->providers->make($model->provider);

        $resolvedStage = $stage;
        $resolvedTools = is_array($tools) ? $tools : [];

        if ($contextPack !== null || $stage !== null) {
            $packStage = AgentStage::tryFrom((string) ($contextPack['stage'] ?? '')) ?? $stage;
            $normalized = $this->stageContext->normalize(
                [
                    'stage' => $packStage?->value ?? $stage?->value,
                    'pack' => is_array($contextPack['pack'] ?? null)
                        ? $contextPack['pack']
                        : (is_array($contextPack) ? $contextPack : []),
                ],
                $packStage ?? $stage,
            );
            $resolvedStage = AgentStage::from($normalized['stage']);
            $systemRules = (string) ($normalized['system_rules'] ?? '');
            $systemBaseline = (string) ($normalized['system_baseline'] ?? '');
            $systemDynamic = (string) ($normalized['system_dynamic'] ?? '');
        }

        $messages = $this->conversationPruner->prune($messages);

        // Executor turns write whole site files. Use the model's full
        // completion cap — a 32k clamp was cutting 8–12 file batches mid-JSX.
        if ($resolvedStage === AgentStage::Executor && ! array_key_exists('max_tokens', $options)) {
            $options['max_tokens'] = max(1, $model->maxOutput);
        }

        if ($resolvedStage === AgentStage::Executor) {
            $resolvedTools = $resolvedTools !== []
                ? $resolvedTools
                : $this->toolCatalog->definitions();

            $forceWriteFile = (bool) data_get($contextPack, 'pack.safetyFlags.forceWriteFile', false);
            if (ProviderToolSupport::isForcedToolChoice($toolChoice)) {
                // Keep client-forced tool (typically write_file or lookup_visuals).
            } elseif ($forceWriteFile) {
                $toolChoice = [
                    'type' => 'function',
                    'function' => ['name' => 'write_file'],
                ];
            } else {
                $toolChoice = LabBuildPolicy::resolveExecutorToolChoice(
                    $contextPack,
                    $toolChoice,
                    $messages,
                );
            }

            Log::info('lab.executor.tools_payload', [
                'provider' => $model->provider,
                'model' => $model->id,
                'api_model' => $model->apiModel,
                'tools_count' => count($resolvedTools),
                'tool_names' => array_values(array_filter(array_map(
                    static fn ($t) => data_get($t, 'function.name'),
                    $resolvedTools,
                ))),
                'tool_choice' => $toolChoice,
            ]);
        } else {
            $resolvedTools = [];
            $toolChoice = null;
        }

        return [
            'driver' => $driver,
            'request' => new ChatRequest(
                apiModel: $model->apiModel,
                system: $systemStable,
                messages: $messages,
                options: $options,
                tools: $resolvedTools,
                toolChoice: $toolChoice,
                stage: $resolvedStage,
                systemRules: $systemRules,
                systemBaseline: $systemBaseline,
                systemDynamic: $systemDynamic,
            ),
            'model' => $model,
            'resolvedStage' => $resolvedStage,
            'resolvedTools' => $resolvedTools,
            'toolChoice' => $toolChoice,
            'contextPack' => $contextPack,
        ];
    }

    /**
     * @param  array{
     *     driver: ChatDriver,
     *     request: ChatRequest,
     *     model: ModelDefinition,
     *     resolvedStage: ?AgentStage,
     *     resolvedTools: array,
     *     toolChoice: mixed,
     *     contextPack: ?array
     * }  $prepared
     */
    private function finalizeTurn(ChatResponse $response, array $prepared): ChatResponse
    {
        $model = $prepared['model'];
        $resolvedStage = $prepared['resolvedStage'];
        $resolvedTools = $prepared['resolvedTools'];
        $toolChoice = $prepared['toolChoice'];
        $contextPack = $prepared['contextPack'];

        $thoughtParsed = $this->thoughtBlock->parse($response->content);
        $parsed = $this->workspaceProposal->parse($thoughtParsed['content']);

        $suggestionParsed = $this->suggestions->parse($parsed['content']);
        $todoParsed = $this->todos->parse($suggestionParsed['content']);
        $isDiscoveryStage = in_array($resolvedStage, [
            AgentStage::Chat,
            AgentStage::Clarify,
            AgentStage::Router,
        ], true);
        $turnRecap = (bool) data_get($contextPack, 'pack.safetyFlags.turnRecap', false);
        $suggestionChips = ($isDiscoveryStage && ! $turnRecap) ? $suggestionParsed['suggestions'] : [];
        $planTodos = $resolvedStage === AgentStage::Executor ? $todoParsed['todos'] : [];

        $proposeWorkspace = $parsed['propose_workspace']
            && $resolvedStage !== AgentStage::Executor
            && ! $turnRecap;

        $toolCalls = $resolvedStage === AgentStage::Executor
            ? $response->toolCalls
            : [];

        $visibleContent = $todoParsed['content'];
        $recovered = false;

        if ($resolvedStage === AgentStage::Executor) {
            $vfsMap = [];
            $hotFiles = [];
            if (is_array($contextPack)) {
                $hotFiles = is_array($contextPack['pack']['hotFiles'] ?? null)
                    ? $contextPack['pack']['hotFiles']
                    : (is_array($contextPack['hotFiles'] ?? null) ? $contextPack['hotFiles'] : []);
            }
            foreach ($hotFiles as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $path = trim((string) ($row['path'] ?? ''));
                if ($path === '') {
                    continue;
                }
                $vfsMap[$path] = (string) ($row['content'] ?? '');
            }

            $recoveredPayload = $this->pseudoTools->recover(
                (string) $response->content,
                $toolCalls,
                $vfsMap,
            );
            if ($recoveredPayload['toolCalls'] === [] && $visibleContent !== '') {
                $recoveredPayload = $this->pseudoTools->recover($visibleContent, $toolCalls, $vfsMap);
            }
            $toolCalls = $recoveredPayload['toolCalls'];
            if ($recoveredPayload['recovered']) {
                $visibleContent = $recoveredPayload['content'] !== ''
                    ? $recoveredPayload['content']
                    : $visibleContent;
                $recovered = true;
            }

            Log::info('lab.executor.tool_calls_result', [
                'provider_native_count' => count($response->toolCalls),
                'final_count' => count($toolCalls),
                'pseudo_recovered' => $recovered,
                'names' => array_map(static fn ($c) => $c->name, $toolCalls),
                'paths' => array_values(array_filter(array_map(
                    static fn ($c) => $c->arguments['path'] ?? null,
                    $toolCalls,
                ))),
                'writes' => array_values(array_filter(array_map(static function ($c) {
                    if (($c->name ?? '') !== 'write_file') {
                        return null;
                    }
                    $content = $c->arguments['content'] ?? null;
                    $bytes = is_string($content) ? strlen($content) : 0;

                    return [
                        'path' => (string) ($c->arguments['path'] ?? ''),
                        'bytes' => $bytes,
                        'empty' => ! is_string($content) || $content === '',
                    ];
                }, $toolCalls))),
                'finish_reason' => $response->meta['finish_reason'] ?? $response->meta['stop_reason'] ?? null,
            ]);
        }

        return new ChatResponse(
            content: $visibleContent,
            modelId: $model->id,
            provider: $model->provider,
            apiModel: $response->apiModel !== '' ? $response->apiModel : $model->apiModel,
            meta: array_merge($response->meta, [
                'stage' => $resolvedStage?->value,
                'tools_offered' => $resolvedTools !== [],
                'tool_choice' => $toolChoice,
                'propose_workspace' => $proposeWorkspace,
                'thought' => $thoughtParsed['thought'],
                'suggestions' => $suggestionChips,
                'todos' => $planTodos,
                'pseudo_tools_recovered' => $recovered,
                'usage' => UsageNormalizer::normalize($response->meta['usage'] ?? null),
            ]),
            toolCalls: $toolCalls,
        );
    }
}
