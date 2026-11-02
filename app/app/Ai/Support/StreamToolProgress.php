<?php

namespace App\Ai\Support;

/**
 * Paint tool_start as soon as the function name is known, then refresh
 * when path/query/pattern arrive in the argument JSON.
 *
 * Waiting for "path" used to hide a whole write_file body (content-first
 * JSON) behind "Waiting for model" while tokens were already streaming.
 */
final class StreamToolProgress
{
    /** @var array<int, true> */
    private array $started = [];

    /** @var array<int, array<string, mixed>> */
    private array $painted = [];

    /**
     * @param  callable(array{type: string, call?: array<string, mixed>}): void  $onEvent
     */
    public function emitStart(
        int $index,
        string $id,
        string $name,
        string $argumentsJson,
        callable $onEvent,
    ): void {
        if ($name === '') {
            return;
        }

        $paint = self::paintArgs($argumentsJson);
        $callId = $id !== '' ? $id : 'call_'.$index;

        if (! isset($this->started[$index])) {
            $this->started[$index] = true;
            $this->painted[$index] = $paint;
            $onEvent([
                'type' => 'tool_start',
                'call' => [
                    'id' => $callId,
                    'name' => $name,
                    'arguments' => $paint,
                ],
            ]);

            return;
        }

        $prev = $this->painted[$index] ?? [];
        $merged = $prev;
        $changed = false;
        foreach (['path', 'query', 'pattern'] as $key) {
            if (! isset($paint[$key]) || ($prev[$key] ?? null) === $paint[$key]) {
                continue;
            }
            $merged[$key] = $paint[$key];
            $changed = true;
        }
        if (! $changed) {
            return;
        }

        $this->painted[$index] = $merged;
        $onEvent([
            'type' => 'tool_start',
            'call' => [
                'id' => $callId,
                'name' => $name,
                'arguments' => $merged,
            ],
        ]);
    }

    public function hasStarted(int $index): bool
    {
        return isset($this->started[$index]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function paintArgs(string $argumentsJson): array
    {
        $paint = PartialJson::peekPaintArgs($argumentsJson);
        $decoded = PartialJson::tryDecode($argumentsJson);
        if ($decoded !== null) {
            $paint = array_merge($paint, array_intersect_key($decoded, array_flip(['path', 'query', 'pattern'])));
        }

        return $paint;
    }
}
