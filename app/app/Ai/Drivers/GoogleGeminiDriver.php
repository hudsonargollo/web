<?php

namespace App\Ai\Drivers;

use App\Ai\Contracts\StreamableChatDriver;
use App\Ai\Data\ChatMessage;
use App\Ai\Data\ChatRequest;
use App\Ai\Data\ChatResponse;
use App\Ai\Data\ChatRole;
use App\Ai\Data\ToolCall;
use App\Ai\Exceptions\ProviderException;
use App\Ai\Support\GeminiStreamParser;
use App\Ai\Support\PromptCache;
use App\Ai\Support\ProviderHttp;
use App\Ai\Support\ProviderSse;
use App\Ai\Support\ProviderToolSupport;
use Illuminate\Http\Client\ConnectionException;

final class GoogleGeminiDriver implements StreamableChatDriver
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
        $url = $this->endpoint($request->apiModel, streaming: false);

        try {
            $response = ProviderHttp::make($this->config)
                ->withQueryParameters(['key' => $key])
                ->post($url, $payload);
        } catch (ConnectionException $e) {
            throw ProviderException::unreachable($this->provider, $e->getMessage());
        }

        if ($response->failed()) {
            throw ProviderException::http($this->provider, $response->status(), $response->body());
        }

        $parts = data_get($response->json(), 'candidates.0.content.parts', []);
        $text = '';
        $toolCalls = [];
        foreach (is_array($parts) ? $parts : [] as $part) {
            if (! is_array($part)) {
                continue;
            }
            if (isset($part['text'])) {
                $text .= (string) $part['text'];
            }
            $call = $part['functionCall'] ?? $part['function_call'] ?? null;
            if (is_array($call) && ($call['name'] ?? '') !== '') {
                $args = $call['args'] ?? $call['arguments'] ?? [];
                if (is_string($args)) {
                    $decoded = json_decode($args, true);
                    $args = is_array($decoded) ? $decoded : [];
                }
                $toolCalls[] = new ToolCall(
                    id: uniqid('gemini_', true),
                    name: (string) $call['name'],
                    arguments: is_array($args) ? $args : [],
                );
            }
        }

        return new ChatResponse(
            content: $text,
            modelId: '',
            provider: $this->provider,
            apiModel: $request->apiModel,
            meta: [
                'usage' => data_get($response->json(), 'usageMetadata'),
                'finish_reason' => data_get($response->json(), 'candidates.0.finishReason'),
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
        $url = $this->endpoint($request->apiModel, streaming: true);

        try {
            $response = ProviderHttp::streaming($this->config)
                ->withQueryParameters([
                    'key' => $key,
                    'alt' => 'sse',
                ])
                ->post($url, $payload);
        } catch (ConnectionException $e) {
            throw ProviderException::unreachable($this->provider, $e->getMessage());
        }

        $parser = new GeminiStreamParser;
        ProviderSse::consume($this->provider, $response, function (array $frame) use ($parser, $onEvent): void {
            $chunk = json_decode($frame['data'], true);
            if (! is_array($chunk)) {
                return;
            }
            $parser->ingest($chunk, $onEvent);
        });

        $meta = $parser->meta();

        return new ChatResponse(
            content: $parser->content(),
            modelId: '',
            provider: $this->provider,
            apiModel: $request->apiModel,
            meta: [
                'usage' => $meta['usage'],
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
        $contents = [];
        $dynamic = $request->resolvedDynamic();
        if ($dynamic !== '') {
            $contents[] = [
                'role' => 'user',
                'parts' => [['text' => "[Krikkit turn context — not visible chat]\n{$dynamic}"]],
            ];
            $contents[] = [
                'role' => 'model',
                'parts' => [['text' => 'Acknowledged turn context.']],
            ];
        }

        /** @var ChatMessage $message */
        foreach ($request->messages as $message) {
            if ($message->role === ChatRole::System) {
                continue;
            }

            $contents[] = [
                'role' => $message->role === ChatRole::Assistant ? 'model' : 'user',
                'parts' => [['text' => $message->content]],
            ];
        }

        $payload = [
            'contents' => $contents,
        ];

        $system = PromptCache::concatenate(
            $request->system,
            $request->systemRules,
            $request->systemBaseline,
        );
        if ($system !== '') {
            $payload['systemInstruction'] = [
                'parts' => [['text' => $system]],
            ];
        }

        $generation = [];
        if (array_key_exists('temperature', $request->options)) {
            $generation['temperature'] = $request->options['temperature'];
        }
        if (array_key_exists('max_tokens', $request->options)) {
            $generation['maxOutputTokens'] = $request->options['max_tokens'];
        }
        if ($generation !== []) {
            $payload['generationConfig'] = $generation;
        }

        if ($request->wantsTools()) {
            $declarations = ProviderToolSupport::toGeminiDeclarations($request->tools);
            if ($declarations !== []) {
                $payload['tools'] = [['functionDeclarations' => $declarations]];
                $payload['toolConfig'] = [
                    'functionCallingConfig' => ProviderToolSupport::geminiFunctionCallingConfig(
                        $request->toolChoice,
                    ),
                ];
            }
        }

        return $payload;
    }

    private function endpoint(string $apiModel, bool $streaming): string
    {
        $base = rtrim((string) ($this->config['base_url'] ?? ''), '/');
        $model = rawurlencode($apiModel);
        $method = $streaming ? 'streamGenerateContent' : 'generateContent';

        return "{$base}/models/{$model}:{$method}";
    }
}
