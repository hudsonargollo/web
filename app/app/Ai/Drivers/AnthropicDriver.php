<?php

namespace App\Ai\Drivers;

use App\Ai\Contracts\StreamableChatDriver;
use App\Ai\Data\ChatMessage;
use App\Ai\Data\ChatRequest;
use App\Ai\Data\ChatResponse;
use App\Ai\Data\ChatRole;
use App\Ai\Data\ToolCall;
use App\Ai\Exceptions\ProviderException;
use App\Ai\Support\AnthropicStreamParser;
use App\Ai\Support\PromptCache;
use App\Ai\Support\ProviderHttp;
use App\Ai\Support\ProviderSse;
use App\Ai\Support\ProviderToolSupport;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;

final class AnthropicDriver implements StreamableChatDriver
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(
        private readonly string $provider,
        private readonly array $config,
    ) {}

    public function complete(ChatRequest $request): ChatResponse
    {
        $key = trim((string) ($this->config['api_key'] ?? ''));
        if ($key === '') {
            throw ProviderException::missingKey($this->provider);
        }

        $payload = $this->payload($request);

        try {
            $response = $this->client($key)->post('/v1/messages', $payload);
        } catch (ConnectionException $e) {
            throw ProviderException::unreachable($this->provider, $e->getMessage());
        }

        if ($response->failed()) {
            throw ProviderException::http($this->provider, $response->status(), $response->body());
        }

        $blocks = data_get($response->json(), 'content', []);
        $text = '';
        $toolCalls = [];
        foreach (is_array($blocks) ? $blocks : [] as $block) {
            $type = $block['type'] ?? null;
            if ($type === 'text') {
                $text .= (string) ($block['text'] ?? '');
            }
            if ($type === 'tool_use') {
                $toolCalls[] = new ToolCall(
                    id: (string) ($block['id'] ?? uniqid('tool_', true)),
                    name: (string) ($block['name'] ?? ''),
                    arguments: is_array($block['input'] ?? null) ? $block['input'] : [],
                );
            }
        }

        return new ChatResponse(
            content: $text,
            modelId: '',
            provider: $this->provider,
            apiModel: (string) data_get($response->json(), 'model', $request->apiModel),
            meta: [
                'usage' => data_get($response->json(), 'usage'),
                'id' => data_get($response->json(), 'id'),
                'stop_reason' => data_get($response->json(), 'stop_reason'),
            ],
            toolCalls: $toolCalls,
        );
    }

    public function stream(ChatRequest $request, callable $onEvent): ChatResponse
    {
        $key = trim((string) ($this->config['api_key'] ?? ''));
        if ($key === '') {
            throw ProviderException::missingKey($this->provider);
        }

        $payload = $this->payload($request);
        $payload['stream'] = true;

        try {
            $response = $this->streamClient($key)->post('/v1/messages', $payload);
        } catch (ConnectionException $e) {
            throw ProviderException::unreachable($this->provider, $e->getMessage());
        }

        $parser = new AnthropicStreamParser;
        ProviderSse::consume($this->provider, $response, function (array $frame) use ($parser, $onEvent): void {
            $payload = json_decode($frame['data'], true);
            if (! is_array($payload)) {
                return;
            }
            $event = $frame['event'] !== 'message'
                ? $frame['event']
                : (string) ($payload['type'] ?? 'message');
            $parser->ingest($event, $payload, $onEvent);
        });

        $meta = $parser->meta($request->apiModel);

        return new ChatResponse(
            content: $parser->content(),
            modelId: '',
            provider: $this->provider,
            apiModel: (string) ($meta['model'] ?? $request->apiModel),
            meta: [
                'usage' => $meta['usage'],
                'id' => $meta['id'],
                'stop_reason' => $meta['stop_reason'],
            ],
            toolCalls: $parser->toolCalls(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(ChatRequest $request): array
    {
        // ChatGateway injects a stage-appropriate max_tokens (executor turns get
        // a large budget); 8192 is only the fallback for bare requests.
        $payload = [
            'model' => $request->apiModel,
            'max_tokens' => (int) ($request->options['max_tokens'] ?? 8192),
            'messages' => $this->formatMessages($request),
        ];

        $system = PromptCache::anthropicSystem(
            stable: $request->system,
            baseline: $request->systemBaseline,
            rules: $request->systemRules,
            padFloor: (bool) ($request->options['prompt_cache_floor'] ?? true),
        );
        if ($system !== '' && $system !== []) {
            $payload['system'] = $system;
        }

        if (array_key_exists('temperature', $request->options)) {
            $payload['temperature'] = $request->options['temperature'];
        }

        if ($request->wantsTools()) {
            $payload['tools'] = ProviderToolSupport::toAnthropicTools($request->tools);
            $payload['tool_choice'] = ProviderToolSupport::anthropicToolChoice($request->toolChoice);
        }

        return $payload;
    }

    /**
     * @return list<array{role: string, content: string}>
     */
    private function formatMessages(ChatRequest $request): array
    {
        $messages = [];
        $dynamic = $request->resolvedDynamic();
        if ($dynamic !== '') {
            $messages[] = [
                'role' => ChatRole::User->value,
                'content' => "[Krikkit turn context — not visible chat]\n{$dynamic}",
            ];
            $messages[] = [
                'role' => ChatRole::Assistant->value,
                'content' => 'Acknowledged turn context.',
            ];
        }

        /** @var ChatMessage $message */
        foreach ($request->messages as $message) {
            if ($message->role === ChatRole::System) {
                continue;
            }

            $messages[] = [
                'role' => $message->role->value,
                'content' => $message->content,
            ];
        }

        return $messages;
    }

    private function client(string $apiKey): PendingRequest
    {
        $base = rtrim((string) ($this->config['base_url'] ?? ''), '/');

        return ProviderHttp::make($this->config)
            ->baseUrl($base)
            ->withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => (string) ($this->config['version'] ?? '2023-06-01'),
            ]);
    }

    private function streamClient(string $apiKey): PendingRequest
    {
        $base = rtrim((string) ($this->config['base_url'] ?? ''), '/');

        return ProviderHttp::streaming($this->config)
            ->baseUrl($base)
            ->withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => (string) ($this->config['version'] ?? '2023-06-01'),
            ]);
    }
}
