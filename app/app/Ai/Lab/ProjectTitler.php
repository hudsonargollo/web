<?php

namespace App\Ai\Lab;

use App\Ai\Data\ChatMessage;
use App\Ai\Data\ChatRequest;
use App\Ai\ModelCatalog;
use App\Ai\PromptStore;
use App\Ai\ProviderFactory;
use Throwable;

/**
 * Product wordmark for a Lab project — header/logo name, not the user's prompt.
 */
final class ProjectTitler
{
    public function __construct(
        private readonly ModelCatalog $catalog,
        private readonly ProviderFactory $providers,
        private readonly PromptStore $prompts,
    ) {}

    public function name(string $brief): string
    {
        if (! $this->isProductBrief($brief)) {
            return 'Untitled';
        }

        $fallback = $this->fallback($brief);

        try {
            $invented = $this->invent($brief);
        } catch (Throwable) {
            return $fallback;
        }

        return $invented ?? $fallback;
    }

    public function fallback(string $brief): string
    {
        $withoutGreeting = $this->stripGreetings($brief);
        $clean = $this->stripOpeners($withoutGreeting !== '' ? $withoutGreeting : $brief);

        if ($clean === '' || $this->isChatNoise($clean)) {
            return 'Untitled';
        }

        if (preg_match('/["“]([^"”]{2,40})["”]/u', $brief, $quoted)) {
            $named = $this->sanitize((string) $quoted[1], $brief);
            if ($named !== null) {
                return $named;
            }
        }

        if (preg_match('/\b([A-Z][a-z0-9]+[A-Z][A-Za-z0-9]+)\b/', $brief, $brand)) {
            $named = $this->clip((string) $brand[1]);
            if (! $this->isChatNoise($named) && ! $this->echoesBrief($named, $brief)) {
                return $named;
            }
        }

        // Never title-case the user's first message into a project name.
        return 'Untitled';
    }

    public function sanitize(string $raw, ?string $brief = null): ?string
    {
        $parsed = (new ThoughtBlockParser)->parse($raw);
        $text = trim($parsed['content']);
        $text = preg_replace('/<\/?thought>/iu', '', $text) ?? $text;
        $text = preg_replace('/^```(?:\w+)?\s*|\s*```$/u', '', trim($text)) ?? $text;
        $text = trim(explode("\n", $text)[0] ?? '');
        $text = trim($text, " \t\n\r\0\x0B\"'`“”‘’");
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $text = preg_replace('/[.!?]+$/u', '', $text) ?? $text;
        $text = trim($text);

        if ($text === '' || str_contains($text, '<') || str_contains($text, '>')) {
            return null;
        }

        if (preg_match('/^(thought|untitled)$/iu', $text)) {
            return null;
        }

        if (mb_strlen($text) > 40) {
            return null;
        }

        $words = preg_split('/\s+/u', $text) ?: [];
        if (count($words) > 4) {
            return null;
        }

        if (preg_match('/\b(please|build|create|make|i want|landing page for)\b/iu', $text)) {
            return null;
        }

        if ($this->isChatNoise($text)) {
            return null;
        }

        if (is_string($brief) && $this->echoesBrief($text, $brief)) {
            return null;
        }

        if (preg_match('/\b(website|web site|landing page|for a|page website|\d+\s*-?\s*page)\b/iu', $text)) {
            return null;
        }

        if (is_string($brief) && $this->restatesBrief($text, $brief)) {
            return null;
        }

        return $this->clip($text);
    }

    public function isPlaceholder(string $title): bool
    {
        $normalized = mb_strtolower(trim($title));

        return $normalized === '' || $normalized === 'untitled';
    }

    private function invent(string $brief): ?string
    {
        $clean = trim(preg_replace('/\s+/u', ' ', $brief) ?? $brief);
        if ($clean === '') {
            return null;
        }

        $modelId = $this->catalog->defaultId();
        if ($modelId === '' || ! $this->catalog->has($modelId)) {
            return null;
        }

        $model = $this->catalog->get($modelId);
        if (! $model->available) {
            return null;
        }

        $driver = $this->providers->make($model->provider);
        $response = $driver->complete(new ChatRequest(
            apiModel: $model->apiModel,
            system: $this->prompts->get('title'),
            messages: [
                ChatMessage::user($this->clip($clean, 400)),
            ],
            options: [
                'temperature' => 0.6,
                'max_tokens' => 256,
                'prompt_cache_floor' => false,
            ],
        ));

        return $this->sanitize($response->content, $brief);
    }

    /**
     * Greetings, small talk, and other first-message chatter are not product names.
     */
    private function isChatNoise(string $text): bool
    {
        $normalized = mb_strtolower(trim(preg_replace('/[^\p{L}\p{N}\s]+/u', '', $text) ?? $text));
        $normalized = trim(preg_replace('/\s+/u', ' ', $normalized) ?? $normalized);

        if ($normalized === '') {
            return true;
        }

        $exact = [
            'hi', 'hey', 'hello', 'yo', 'sup', 'hola', 'salam',
            'whats up', 'what s up', 'good morning', 'good evening', 'good night',
            'thanks', 'thank you',
            'test', 'testing', 'asdf', 'asd',
        ];

        if (in_array($normalized, $exact, true)) {
            return true;
        }

        $words = preg_split('/\s+/u', $normalized) ?: [];

        // Prefix greetings only count as noise when the whole message is small talk.
        return count($words) <= 4 && (bool) preg_match(
            '/^(hi|hey|hello|yo|hola|salam)\b/u',
            $normalized,
        );
    }

    private function isProductBrief(string $brief): bool
    {
        $withoutGreeting = $this->stripGreetings($brief);
        if ($withoutGreeting === '' || $this->isChatNoise($withoutGreeting)) {
            return false;
        }

        $clean = $this->stripOpeners($withoutGreeting);
        if ($clean === '' || $this->isChatNoise($clean)) {
            return false;
        }

        if (preg_match('/["“]([^"”]{2,40})["”]/u', $brief)) {
            return true;
        }

        if (preg_match('/\b([A-Z][a-z0-9]+[A-Z][A-Za-z0-9]+)\b/', $brief)) {
            return true;
        }

        if (preg_match('/\b(site|website|web|app|landing|page|store|shop|portfolio|dashboard|saas|quiz|e-?commerce)\b/iu', $brief)) {
            return true;
        }

        $words = preg_split('/\s+/u', $clean) ?: [];
        $words = array_values(array_filter($words, static fn (string $word): bool => $word !== ''));

        return count($words) >= 4 && mb_strlen($clean) >= 24;
    }

    private function stripGreetings(string $text): string
    {
        $clean = trim(preg_replace('/\s+/u', ' ', $text) ?? $text);

        do {
            $before = $clean;
            $clean = trim(preg_replace(
                '/^(?:hi|hey|hello|yo|hola|salam|what(?:[\'’]s|s)?\s+up)(?:\s*[!,.…]+\s*|\s+)/iu',
                '',
                $clean,
            ) ?? $clean);
        } while ($clean !== $before && $clean !== '');

        return $clean;
    }

    private function echoesBrief(string $title, string $brief): bool
    {
        $fold = static function (string $value): string {
            $value = mb_strtolower(preg_replace('/[^\p{L}\p{N}]+/u', '', $value) ?? $value);

            return $value;
        };

        $titleFold = $fold($title);
        $briefFold = $fold($brief);

        if ($titleFold === '' || $briefFold === '') {
            return false;
        }

        if ($titleFold === $briefFold) {
            return true;
        }

        $titleLen = mb_strlen($titleFold);
        $briefLen = mb_strlen($briefFold);

        if ($titleLen < 4 || $titleLen > $briefLen) {
            return false;
        }

        return str_starts_with($briefFold, $titleFold)
            && ($titleLen / $briefLen) >= 0.45;
    }

    /**
     * "Beauty Salon" / "3 Page Website" — the brief restated, not a wordmark.
     */
    private function restatesBrief(string $title, string $brief): bool
    {
        $words = static function (string $value): array {
            $normalized = mb_strtolower(preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $value) ?? $value);
            $parts = preg_split('/\s+/u', trim($normalized)) ?: [];

            return array_values(array_filter($parts, static fn (string $word): bool => $word !== ''));
        };

        $titleWords = $words($title);
        $briefWords = $words($brief);

        if (count($titleWords) < 2 || $briefWords === []) {
            return false;
        }

        return array_diff($titleWords, $briefWords) === [];
    }

    private function stripOpeners(string $brief): string
    {
        $clean = trim(preg_replace('/\s+/u', ' ', $brief) ?? $brief);
        $openers = [
            '/^(?:i\s+want\s+to|i\'d\s+like\s+to|please|can\s+you)\s+/iu',
            '/^(?:build|create|make)(?:\s+me)?\s+/iu',
            '/^(?:a|an|the)\s+/iu',
        ];

        do {
            $before = $clean;
            foreach ($openers as $pattern) {
                $clean = trim(preg_replace($pattern, '', $clean) ?? $clean);
            }
        } while ($clean !== $before);

        return trim(preg_replace('/[.?!]+$/u', '', $clean) ?? $clean);
    }

    private function clip(string $value, int $width = 40): string
    {
        return mb_strimwidth($value, 0, $width, '');
    }
}
