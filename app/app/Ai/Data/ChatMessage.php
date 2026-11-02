<?php

namespace App\Ai\Data;

final readonly class ChatMessage
{
    public function __construct(
        public ChatRole $role,
        public string $content,
    ) {}

    public static function system(string $content): self
    {
        return new self(ChatRole::System, $content);
    }

    public static function user(string $content): self
    {
        return new self(ChatRole::User, $content);
    }

    public static function assistant(string $content): self
    {
        return new self(ChatRole::Assistant, $content);
    }

    /**
     * @return array{role: string, content: string}
     */
    public function toArray(): array
    {
        return [
            'role' => $this->role->value,
            'content' => $this->content,
        ];
    }
}
