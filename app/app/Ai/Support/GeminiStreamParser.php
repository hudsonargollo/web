<?php

namespace App\Ai\Support;

use App\Ai\Data\ToolCall;

/**
 * Accumulate Gemini streamGenerateContent SSE chunks into text + functionCall parts.
 */
final class GeminiStreamParser
{
    private string $content = '';

    /** @var list<ToolCall> */
    private array $toolCalls = [];

    /** @var array<string, true> */
    private array $started = [];

    private ?array $usage = null;

    private ?string $finishReason = null;

    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    public function ingest(array $chunk, callable $onEvent): void
    {
        if (isset($chunk['usageMetadata']) && is_array($chunk['usageMetadata'])) {
            $this->usage = $chunk['usageMetadata'];
        }

        $reason = data_get($chunk, 'candidates.0.finishReason');
        if (is_string($reason) && $reason !== '') {
            $this->finishReason = $reason;
        }

        $parts = data_get($chunk, 'candidates.0.content.parts', []);
        if (! is_array($parts)) {
            return;
        }

        foreach ($parts as $part) {
            if (! is_array($part)) {
                continue;
            }
            if (isset($part['text']) && is_string($part['text']) && $part['text'] !== '') {
                $this->content .= $part['text'];
                $onEvent(['type' => 'text_delta', 'text' => $part['text']]);
            }

            $call = $part['functionCall'] ?? $part['function_call'] ?? null;
            if (! is_array($call) || ($call['name'] ?? '') === '') {
                continue;
            }

            $args = $call['args'] ?? $call['arguments'] ?? [];
            if (is_string($args)) {
                $decoded = json_decode($args, true);
                $args = is_array($decoded) ? $decoded : [];
            }
            if (! is_array($args)) {
                $args = [];
            }

            $tool = new ToolCall(
                id: uniqid('gemini_', true),
                name: (string) $call['name'],
                arguments: $args,
            );
            $this->toolCalls[] = $tool;

            $key = $tool->name.'|'.(string) ($args['path'] ?? $args['query'] ?? $args['pattern'] ?? $tool->id);
            if (! isset($this->started[$key])) {
                $this->started[$key] = true;
                $onEvent([
                    'type' => 'tool_start',
                    'call' => [
                        'id' => $tool->id,
                        'name' => $tool->name,
                        'arguments' => PartialJson::startPaintArgs($args),
                    ],
                ]);
                // Gemini delivers functionCall parts whole — the call is already complete.
                $onEvent([
                    'type' => 'tool_end',
                    'call' => [
                        'id' => $tool->id,
                        'name' => $tool->name,
                        'arguments' => PartialJson::endPaintArgs($tool->name, $args),
                    ],
                ]);
            }
        }
    }

    /**
     * @return list<ToolCall>
     */
    public function toolCalls(): array
    {
        return $this->toolCalls;
    }

    public function content(): string
    {
        return $this->content;
    }

    /**
     * @return array{usage: mixed, finish_reason: mixed}
     */
    public function meta(): array
    {
        return [
            'usage' => $this->usage,
            'finish_reason' => $this->finishReason,
        ];
    }
}
