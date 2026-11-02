<?php

namespace App\Ai;

use App\Ai\Exceptions\AiException;
use Illuminate\Support\Facades\File;

/**
 * Shared prompts by key. Models do not get their own prompt files —
 * ChatGateway always loads one prompt key, then routes by model.
 *
 * Each key may point at a single file path or an ordered list of paths
 * (joined with blank lines) so stable layers like design directives can
 * ride alongside the base system prompt.
 */
final class PromptStore
{
    /**
     * @param  array<string, string|list<string>>  $paths  prompt key → file path(s)
     */
    public function __construct(
        private readonly array $paths,
    ) {}

    public function get(string $key): string
    {
        $configured = $this->paths[$key] ?? null;

        if ($configured === null || $configured === '' || $configured === []) {
            throw new AiException("Unknown prompt key [{$key}]. Register it under config/ai.php → prompts.");
        }

        $files = is_array($configured) ? $configured : [$configured];
        $chunks = [];

        foreach ($files as $index => $path) {
            if (! is_string($path) || $path === '') {
                throw new AiException("Prompt path #{$index} for [{$key}] must be a non-empty string.");
            }

            if (! File::isFile($path)) {
                throw new AiException("Prompt file missing for [{$key}]: {$path}");
            }

            $body = trim(File::get($path));
            if ($body !== '') {
                $chunks[] = $body;
            }
        }

        if ($chunks === []) {
            throw new AiException("Prompt [{$key}] resolved to empty content.");
        }

        return implode("\n\n", $chunks);
    }

    /**
     * @return list<string>
     */
    public function keys(): array
    {
        return array_keys($this->paths);
    }
}
