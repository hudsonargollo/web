<?php

namespace App\Ai\Contracts;

use App\Ai\Data\ChatRequest;
use App\Ai\Data\ChatResponse;

/**
 * Provider chat that can emit tokens / tool-call starts while the HTTP body is still open.
 *
 * $onEvent receives:
 * - ['type' => 'text_delta', 'text' => string]
 * - ['type' => 'tool_start', 'call' => array{id: string, name: string, arguments: array<string, mixed>}]
 * - ['type' => 'tool_end', 'call' => array{id: string, name: string, arguments: array<string, mixed>}]
 *
 * stream() must still return a full ChatResponse (same shape as complete()).
 */
interface StreamableChatDriver extends ChatDriver
{
    /**
     * @param  callable(array{type: string, text?: string, call?: array<string, mixed>}): void  $onEvent
     */
    public function stream(ChatRequest $request, callable $onEvent): ChatResponse;
}
