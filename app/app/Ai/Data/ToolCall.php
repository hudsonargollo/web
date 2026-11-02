<?php

namespace App\Ai\Data;

use App\Ai\Support\PartialJson;

/**
 * One native tool / function call from a model (provider-agnostic).
 *
 * @phpstan-type ToolCallArgs array<string, mixed>
 */
final readonly class ToolCall
{
    /**
     * @param  array<string, mixed>  $arguments
     */
    public function __construct(
        public string $id,
        public string $name,
        public array $arguments = [],
    ) {}

    /**
     * @param  array<string, mixed>  $row
     */
    public static function fromArray(array $row): self
    {
        $arguments = $row['arguments'] ?? [];
        if (is_string($arguments)) {
            $decoded = PartialJson::tryDecodeLenient($arguments);
            $arguments = is_array($decoded) ? $decoded : [];
        }

        return new self(
            id: (string) ($row['id'] ?? uniqid('call_', true)),
            name: (string) ($row['name'] ?? ''),
            arguments: is_array($arguments) ? $arguments : [],
        );
    }

    /**
     * @return array{id: string, name: string, arguments: array<string, mixed>}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'arguments' => $this->arguments,
        ];
    }
}
