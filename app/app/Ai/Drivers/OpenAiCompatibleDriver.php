<?php

namespace App\Ai\Drivers;

use App\Ai\Contracts\StreamableChatDriver;
use App\Ai\Data\ChatMessage;
use App\Ai\Data\ChatRequest;
use App\Ai\Data\ChatResponse;
use App\Ai\Data\ChatRole;
use App\Ai\Data\ToolCall;
use App\Ai\Exceptions\ProviderException;
use App\Ai\Support\OpenAiStreamParser;
use App\Ai\Support\PromptCache;
use App\Ai\Support\ProviderHttp;
use App\Ai\Support\ProviderSse;
use App\Ai\Support\ProviderToolSupport;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;

/**
 * Chat Completions API used by OpenAI, xAI, DeepSeek, Groq, Mistral, ZhipuAI, etc.
 */
final class OpenAiCompatibleDriver implements StreamableChatDriver
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
            $response = $this->client($key)->post('/chat/completions', $payload);
        } catch (ConnectionException $e) {
            throw ProviderException::unreachable($this->provider, $e->getMessage());
        }

        if ($response->failed()) {
            throw ProviderException::http($this->provider, $response->status(), $response->body());
        }

        $message = data_get($response->json(), 'choices.0.message', []);
        $content = (string) data_get($message, 'content', '');
        $toolCalls = [];
        foreach (data_get($message, 'tool_calls', []) ?: [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $toolCalls[] = ToolCall::fromArray([
                'id' => (string) ($row['id'] ?? ''),
                'name' => (string) data_get($row, 'function.name', ''),
                'arguments' => data_get($row, 'function.arguments', []),
            ]);
        }

        return new ChatResponse(
            content: $content,
            modelId: '',
            provider: $this->provider,
            apiModel: (string) data_get($response->json(), 'model', $request->apiModel),
            meta: [
                'usage' => data_get($response->json(), 'usage'),
                'id' => data_get($response->json(), 'id'),
                'finish_reason' => data_get($response->json(), 'choices.0.finish_reason'),
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
        if ($this->provider === 'openai') {
            $payload['stream_options'] = ['include_usage' => true];
        }

        try {
            $response = $this->streamClient($key)->post('/chat/completions', $payload);
        } catch (ConnectionException $e) {
            throw ProviderException::unreachable($this->provider, $e->getMessage());
        }

        $parser = new OpenAiStreamParser;
        ProviderSse::consume($this->provider, $response, function (array $frame) use ($parser, $onEvent): void {
            if ($frame['data'] === '[DONE]') {
                return;
            }
            $chunk = json_decode($frame['data'], true);
            if (! is_array($chunk)) {
                return;
            }
            $parser->ingest($chunk, $onEvent);
        });
        $parser->finish($onEvent);

        $meta = $parser->meta($request->apiModel);

        return new ChatResponse(
            content: $parser->content(),
            modelId: '',
            provider: $this->provider,
            apiModel: (string) ($meta['model'] ?? $request->apiModel),
            meta: [
                'usage' => $meta['usage'],
                'id' => $meta['id'],
                'finish_reason' => $meta['finish_reason'],
            ],
            toolCalls: $parser->toolCalls(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(ChatRequest $request): array
    {
        $payload = [
            'model' => $request->apiModel,
            'messages' => $this->formatMessages($request),
        ];

        foreach (['temperature', 'max_tokens', 'top_p'] as $option) {
            if (array_key_exists($option, $request->options)) {
                $payload[$option] = $request->options[$option];
            }
        }

        if ($request->wantsTools()) {
            $payload['tools'] = $request->tools;
            $payload['tool_choice'] = ProviderToolSupport::openAiToolChoice($request->toolChoice);
        }

        return $payload;
    }

    /**
     * @return list<array{role: string, content: string}>
     */
    private function formatMessages(ChatRequest $request): array
    {
        $messages = [];

        $system = PromptCache::concatenate(
            $request->system,
            $request->systemRules,
            $request->systemBaseline,
        );
        if ($system !== '') {
            $messages[] = ['role' => ChatRole::System->value, 'content' => $system];
        }

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

            $messages[] = $message->toArray();
        }

        return $messages;
    }

    private function client(string $apiKey): PendingRequest
    {
        $base = rtrim((string) ($this->config['base_url'] ?? ''), '/');

        return ProviderHttp::make($this->config)
            ->baseUrl($base)
            ->withToken($apiKey);
    }

    private function streamClient(string $apiKey): PendingRequest
    {
        $base = rtrim((string) ($this->config['base_url'] ?? ''), '/');

        return ProviderHttp::streaming($this->config)
            ->baseUrl($base)
            ->withToken($apiKey);
    }
}
