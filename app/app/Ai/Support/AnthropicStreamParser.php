<?php

namespace App\Ai\Support;

use App\Ai\Data\ToolCall;

/**
 * Accumulate Anthropic Messages SSE into text + tool_use blocks.
 */
final class AnthropicStreamParser
{
    private string $content = '';

    /** @var array<int, array{id: string, name: string, arguments: string, kind: string}> */
    private array $blocks = [];

    private StreamToolProgress $progress;

    /** @var array<int, true> */
    private array $ended = [];

    private ?array $usage = null;

    private ?string $stopReason = null;

    private ?string $id = null;

    private ?string $model = null;

    public function __construct()
    {
        $this->progress = new StreamToolProgress;
    }

    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    public function ingest(string $event, array $payload, callable $onEvent): void
    {
        if ($event === 'message_start') {
            $message = is_array($payload['message'] ?? null) ? $payload['message'] : $payload;
            if (isset($message['id']) && is_string($message['id'])) {
                $this->id = $message['id'];
            }
            if (isset($message['model']) && is_string($message['model'])) {
                $this->model = $message['model'];
            }
            if (isset($message['usage']) && is_array($message['usage'])) {
                $this->usage = $message['usage'];
            }

            return;
        }

        if ($event === 'content_block_start') {
            $index = (int) ($payload['index'] ?? 0);
            $block = is_array($payload['content_block'] ?? null) ? $payload['content_block'] : [];
            $type = (string) ($block['type'] ?? '');
            $this->blocks[$index] = [
                'id' => (string) ($block['id'] ?? ''),
                'name' => (string) ($block['name'] ?? ''),
                'arguments' => '',
                'kind' => $type,
            ];
            if ($type === 'tool_use' && $this->blocks[$index]['name'] !== '') {
                $input = $block['input'] ?? [];
                if (is_array($input) && $input !== []) {
                    $encoded = json_encode($input);
                    $this->blocks[$index]['arguments'] = is_string($encoded) ? $encoded : '';
                }
                $this->maybeStart($index, $onEvent);
            }

            return;
        }

        if ($event === 'content_block_delta') {
            $index = (int) ($payload['index'] ?? 0);
            $delta = is_array($payload['delta'] ?? null) ? $payload['delta'] : [];
            $type = (string) ($delta['type'] ?? '');
            if ($type === 'text_delta') {
                $text = (string) ($delta['text'] ?? '');
                if ($text !== '') {
                    $this->content .= $text;
                    $onEvent(['type' => 'text_delta', 'text' => $text]);
                }
            }
            if ($type === 'input_json_delta') {
                $this->blocks[$index]['arguments'] = ($this->blocks[$index]['arguments'] ?? '')
                    .(string) ($delta['partial_json'] ?? '');
                $this->maybeStart($index, $onEvent);
            }

            return;
        }

        if ($event === 'content_block_stop') {
            $index = (int) ($payload['index'] ?? 0);
            $this->maybeStart($index, $onEvent);
            $this->maybeEnd($index, $onEvent);

            return;
        }

        if ($event === 'message_delta') {
            $delta = is_array($payload['delta'] ?? null) ? $payload['delta'] : [];
            if (isset($delta['stop_reason']) && is_string($delta['stop_reason']) && $delta['stop_reason'] !== '') {
                $this->stopReason = $delta['stop_reason'];
            }
            if (isset($payload['usage']) && is_array($payload['usage'])) {
                $this->usage = array_merge($this->usage ?? [], $payload['usage']);
            }
        }
    }

    /**
     * @return list<ToolCall>
     */
    public function toolCalls(): array
    {
        $calls = [];
        ksort($this->blocks);
        foreach ($this->blocks as $block) {
            if (($block['kind'] ?? '') !== 'tool_use' || ($block['name'] ?? '') === '') {
                continue;
            }
            $calls[] = ToolCall::fromArray([
                'id' => $block['id'],
                'name' => $block['name'],
                'arguments' => $block['arguments'],
            ]);
        }

        return $calls;
    }

    public function content(): string
    {
        return $this->content;
    }

    /**
     * @return array{usage: mixed, id: mixed, stop_reason: mixed, model: mixed}
     */
    public function meta(string $fallbackModel): array
    {
        return [
            'usage' => $this->usage,
            'id' => $this->id,
            'stop_reason' => $this->stopReason,
            'model' => $this->model ?? $fallbackModel,
        ];
    }

    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    private function maybeStart(int $index, callable $onEvent): void
    {
        $block = $this->blocks[$index] ?? null;
        if (! is_array($block) || ($block['kind'] ?? '') !== 'tool_use') {
            return;
        }

        $id = (string) $block['id'];
        $this->progress->emitStart(
            $index,
            $id !== '' ? $id : 'tool_'.$index,
            (string) $block['name'],
            (string) $block['arguments'],
            $onEvent,
        );
    }

    /**
     * The block's input JSON is complete — the model finished this tool call.
     *
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    private function maybeEnd(int $index, callable $onEvent): void
    {
        if (isset($this->ended[$index]) || ! $this->progress->hasStarted($index)) {
            return;
        }

        $block = $this->blocks[$index] ?? null;
        if (! is_array($block) || ($block['kind'] ?? '') !== 'tool_use' || $block['name'] === '') {
            return;
        }

        $decoded = PartialJson::tryDecodeLenient($block['arguments']) ?? [];
        $paint = PartialJson::endPaintArgs($block['name'], $decoded);

        $this->ended[$index] = true;
        $onEvent([
            'type' => 'tool_end',
            'call' => [
                'id' => $block['id'] !== '' ? $block['id'] : 'tool_'.$index,
                'name' => $block['name'],
                'arguments' => $paint,
            ],
        ]);
    }
}
