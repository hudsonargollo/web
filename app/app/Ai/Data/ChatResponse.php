<?php

namespace App\Ai\Data;

final readonly class ChatResponse
{
    /**
     * @param  list<ToolCall>  $toolCalls
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public string $content,
        public string $modelId,
        public string $provider,
        public string $apiModel,
        public array $meta = [],
        public array $toolCalls = [],
    ) {}

    /**
     * @return list<array{id: string, name: string, arguments: array<string, mixed>}>
     */
    public function toolCallsPayload(): array
    {
        return array_map(
            static fn (ToolCall $call): array => $call->toArray(),
            $this->toolCalls,
        );
    }
}
