<?php

namespace App\Ai\Support;

use App\Ai\Data\ToolCall;

/**
 * Accumulate OpenAI Chat Completions SSE deltas into text + native tool_calls.
 */
final class OpenAiStreamParser
{
    private string $content = '';

    /** @var array<int, array{id: string, name: string, arguments: string}> */
    private array $tools = [];

    private StreamToolProgress $progress;

    /** @var array<int, true> */
    private array $completed = [];

    private ?array $usage = null;

    private ?string $finishReason = null;

    private ?string $id = null;

    private ?string $model = null;

    public function __construct()
    {
        $this->progress = new StreamToolProgress;
    }

    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    public function ingest(array $chunk, callable $onEvent): void
    {
        if (isset($chunk['id']) && is_string($chunk['id']) && $chunk['id'] !== '') {
            $this->id = $chunk['id'];
        }
        if (isset($chunk['model']) && is_string($chunk['model']) && $chunk['model'] !== '') {
            $this->model = $chunk['model'];
        }
        if (isset($chunk['usage']) && is_array($chunk['usage'])) {
            $this->usage = $chunk['usage'];
        }

        $choice = data_get($chunk, 'choices.0', []);
        if (! is_array($choice)) {
            return;
        }

        $reason = $choice['finish_reason'] ?? null;
        if (is_string($reason) && $reason !== '') {
            $this->finishReason = $reason;
        }

        $delta = $choice['delta'] ?? [];
        if (! is_array($delta)) {
            $delta = [];
        }

        $text = $delta['content'] ?? null;
        if (is_string($text) && $text !== '') {
            $this->content .= $text;
            $onEvent(['type' => 'text_delta', 'text' => $text]);
        }

        $toolDeltas = $delta['tool_calls'] ?? [];
        if (is_array($toolDeltas)) {
            foreach ($toolDeltas as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $this->ingestToolDelta($row, $onEvent);
            }
        }

        if ($this->finishReason !== null) {
            $this->completeAll($onEvent);
        }
    }

    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    public function finish(callable $onEvent): void
    {
        $this->completeAll($onEvent);
    }

    /**
     * @return list<ToolCall>
     */
    public function toolCalls(): array
    {
        $calls = [];
        ksort($this->tools);
        foreach ($this->tools as $slot) {
            $calls[] = ToolCall::fromArray([
                'id' => $slot['id'],
                'name' => $slot['name'],
                'arguments' => $slot['arguments'],
            ]);
        }

        return $calls;
    }

    public function content(): string
    {
        return $this->content;
    }

    /**
     * @return array{usage: mixed, id: mixed, finish_reason: mixed}
     */
    public function meta(string $fallbackModel): array
    {
        return [
            'usage' => $this->usage,
            'id' => $this->id,
            'finish_reason' => $this->finishReason,
            'model' => $this->model ?? $fallbackModel,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    private function ingestToolDelta(array $row, callable $onEvent): void
    {
        $index = (int) ($row['index'] ?? 0);
        if (! isset($this->tools[$index])) {
            $this->completeBefore($index, $onEvent);
            $this->tools[$index] = [
                'id' => '',
                'name' => '',
                'arguments' => '',
            ];
        }

        if (isset($row['id']) && is_string($row['id']) && $row['id'] !== '') {
            $this->tools[$index]['id'] = $row['id'];
        }

        $function = $row['function'] ?? [];
        if (is_array($function)) {
            if (isset($function['name']) && is_string($function['name']) && $function['name'] !== '') {
                $this->tools[$index]['name'] = $function['name'];
            }
            if (isset($function['arguments']) && is_string($function['arguments'])) {
                $this->tools[$index]['arguments'] .= $function['arguments'];
            }
        }

        $this->emitStart($index, $onEvent);

        if (PartialJson::tryDecode($this->tools[$index]['arguments']) !== null) {
            $this->completeIndex($index, $onEvent);
        }
    }

    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    private function completeBefore(int $index, callable $onEvent): void
    {
        foreach (array_keys($this->tools) as $prior) {
            if ($prior < $index) {
                $this->completeIndex((int) $prior, $onEvent);
            }
        }
    }

    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    private function completeAll(callable $onEvent): void
    {
        foreach (array_keys($this->tools) as $index) {
            $this->completeIndex((int) $index, $onEvent);
        }
    }

    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    private function emitStart(int $index, callable $onEvent): void
    {
        $slot = $this->tools[$index] ?? null;
        if (! is_array($slot)) {
            return;
        }

        $this->progress->emitStart(
            $index,
            (string) $slot['id'],
            (string) $slot['name'],
            (string) $slot['arguments'],
            $onEvent,
        );
    }

    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    private function completeIndex(int $index, callable $onEvent): void
    {
        if (isset($this->completed[$index])) {
            return;
        }

        $this->emitStart($index, $onEvent);
        $this->completed[$index] = true;

        $slot = $this->tools[$index] ?? null;
        if (! is_array($slot) || $slot['name'] === '' || ! $this->progress->hasStarted($index)) {
            return;
        }

        $decoded = PartialJson::tryDecodeLenient($slot['arguments']) ?? [];
        $paint = PartialJson::endPaintArgs($slot['name'], $decoded);

        $onEvent([
            'type' => 'tool_end',
            'call' => [
                'id' => $slot['id'] !== '' ? $slot['id'] : 'call_'.$index,
                'name' => $slot['name'],
                'arguments' => $paint,
            ],
        ]);
    }
}
