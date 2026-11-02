<?php

namespace App\Ai\Data;

final readonly class ChatRequest
{
    /**
     * @param  list<ChatMessage>  $messages  Conversation turns (no system — system is separate).
     * @param  array<string, mixed>  $options  Driver-specific extras (temperature, max_tokens, …).
     * @param  list<array<string, mixed>>  $tools  OpenAI-compatible tool definitions (optional).
     * @param  string|array<string, mixed>|null  $toolChoice  auto|none|required|{type:function,…}
     * @param  string  $system  Stable base prompt (cacheable).
     * @param  string  $systemRules  Stage rules / policy hints (cacheable).
     * @param  string  $systemBaseline  Session + VFS manifest baseline (cacheable).
     * @param  string  $systemDynamic  Hot files / observations / turn-local flags (uncached).
     * @param  string  $systemSuffix  Legacy alias — treated as dynamic when systemDynamic empty.
     */
    public function __construct(
        public string $apiModel,
        public string $system,
        public array $messages,
        public array $options = [],
        public array $tools = [],
        public string|array|null $toolChoice = null,
        public ?AgentStage $stage = null,
        public string $systemSuffix = '',
        public string $systemRules = '',
        public string $systemBaseline = '',
        public string $systemDynamic = '',
    ) {}

    public function wantsTools(): bool
    {
        return $this->tools !== [];
    }

    public function resolvedDynamic(): string
    {
        $dynamic = trim($this->systemDynamic);

        return $dynamic !== '' ? $dynamic : trim($this->systemSuffix);
    }

    /** Full system string (stable → rules → baseline → dynamic) for non-block providers. */
    public function fullSystem(): string
    {
        return \App\Ai\Support\PromptCache::concatenate(
            $this->system,
            $this->systemRules,
            $this->systemBaseline,
            $this->resolvedDynamic(),
        );
    }
}
