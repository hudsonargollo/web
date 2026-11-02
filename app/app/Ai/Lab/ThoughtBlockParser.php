<?php

namespace App\Ai\Lab;

/**
 * Extracts a mandatory pre-response <thought>…</thought> block and strips it
 * from user-visible assistant content. Thought body is raw unformatted prose.
 */
final class ThoughtBlockParser
{
    /**
     * @return array{content: string, thought: string|null}
     */
    public function parse(string $content): array
    {
        $thoughtParts = [];
        $clean = $content;

        if (preg_match_all('/<thought>\s*([\s\S]*?)\s*<\/thought>/iu', $clean, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $body = $this->sanitizeThoughtProse((string) ($match[1] ?? ''));
                if ($body !== '') {
                    $thoughtParts[] = $body;
                }
            }
            $clean = preg_replace('/\s*<thought>\s*[\s\S]*?\s*<\/thought>\s*/iu', "\n", $clean) ?? $clean;
        }

        // Unclosed thought — treat remainder as thought, never paint tags in chat.
        if (preg_match('/<thought>\s*([\s\S]*)$/iu', $clean, $open)) {
            $body = $this->sanitizeThoughtProse((string) ($open[1] ?? ''));
            if ($body !== '') {
                $thoughtParts[] = $body;
            }
            $clean = preg_replace('/\s*<thought>\s*[\s\S]*$/iu', '', $clean) ?? $clean;
        }

        // Stray closing tag
        $clean = preg_replace('/\s*<\/thought>\s*/iu', "\n", $clean) ?? $clean;

        $clean = preg_replace("/[ \t]+\n/", "\n", $clean) ?? $clean;
        $clean = preg_replace("/\n{3,}/", "\n\n", $clean) ?? $clean;

        $thought = $thoughtParts === [] ? null : implode("\n\n", $thoughtParts);

        return [
            'content' => trim($clean),
            'thought' => $thought,
        ];
    }

    /**
     * Collapse bullet / numbered / checklist lines into continuous prose.
     */
    public function sanitizeThoughtProse(string $text): string
    {
        $raw = trim(str_replace(["\r\n", "\r"], "\n", $text));
        if ($raw === '') {
            return '';
        }

        $paragraphs = [];
        $bucket = [];

        $flush = static function () use (&$paragraphs, &$bucket): void {
            if ($bucket === []) {
                return;
            }
            $joined = preg_replace('/\s+/u', ' ', implode(' ', $bucket)) ?? '';
            $joined = trim($joined);
            if ($joined !== '') {
                $paragraphs[] = $joined;
            }
            $bucket = [];
        };

        foreach (explode("\n", $raw) as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                $flush();
                continue;
            }

            $cleaned = preg_replace('/^[-*•–—]\s+/u', '', $trimmed) ?? $trimmed;
            $cleaned = preg_replace('/^\d+[.)]\s+/u', '', $cleaned) ?? $cleaned;
            $cleaned = preg_replace('/^[A-Za-z][.)]\s+/u', '', $cleaned) ?? $cleaned;
            $cleaned = preg_replace(
                '/^(?:What|Current|Do I|If executor|User request|Stage|Tools?)\s*:\s*/iu',
                '',
                $cleaned,
            ) ?? $cleaned;
            $cleaned = trim($cleaned);

            if ($cleaned !== '') {
                $bucket[] = $cleaned;
            }
        }
        $flush();

        return implode("\n\n", $paragraphs);
    }
}
