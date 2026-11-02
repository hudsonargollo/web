<?php

namespace App\Ai\Lab;

/**
 * Extracts ephemeral suggested-reply chips from assistant content and strips
 * the <suggestions>…</suggestions> tag so it never reaches chat history.
 *
 * Expected form (JSON array of short strings):
 * <suggestions>["Option A", "Option B", "Option C"]</suggestions>
 */
final class SuggestionsParser
{
    private const MAX_ITEMS = 3;

    private const MAX_ITEM_CHARS = 80;

    /**
     * @return array{content: string, suggestions: list<string>}
     */
    public function parse(string $content): array
    {
        $suggestions = [];
        $clean = $content;

        if (preg_match_all('/<suggestions>\s*([\s\S]*?)\s*<\/suggestions>/iu', $clean, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                foreach ($this->decodeList((string) ($match[1] ?? '')) as $item) {
                    $suggestions[] = $item;
                }
            }
            $clean = preg_replace('/\s*<suggestions>\s*[\s\S]*?\s*<\/suggestions>\s*/iu', "\n", $clean) ?? $clean;
        }

        // Unclosed tag — drop remainder so markup never paints in chat.
        if (preg_match('/<suggestions>\s*([\s\S]*)$/iu', $clean, $open)) {
            foreach ($this->decodeList((string) ($open[1] ?? '')) as $item) {
                $suggestions[] = $item;
            }
            $clean = preg_replace('/\s*<suggestions>\s*[\s\S]*$/iu', '', $clean) ?? $clean;
        }

        $clean = preg_replace('/\s*<\/suggestions>\s*/iu', "\n", $clean) ?? $clean;
        $clean = preg_replace("/[ \t]+\n/", "\n", $clean) ?? $clean;
        $clean = preg_replace("/\n{3,}/", "\n\n", $clean) ?? $clean;

        return [
            'content' => trim($clean),
            'suggestions' => $this->normalizeList($suggestions),
        ];
    }

    /**
     * @return list<string>
     */
    private function decodeList(string $raw): array
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return [];
        }

        $decoded = json_decode($trimmed, true);
        if (is_array($decoded)) {
            $items = [];
            foreach ($decoded as $value) {
                if (is_string($value) || is_numeric($value)) {
                    $items[] = (string) $value;
                }
            }

            return $items;
        }

        return [];
    }

    /**
     * @param  list<string>  $items
     * @return list<string>
     */
    private function normalizeList(array $items): array
    {
        $out = [];
        $seen = [];

        foreach ($items as $item) {
            $label = trim(preg_replace('/\s+/u', ' ', (string) $item) ?? '');
            if ($label === '') {
                continue;
            }
            if (mb_strlen($label) > self::MAX_ITEM_CHARS) {
                $label = rtrim(mb_substr($label, 0, self::MAX_ITEM_CHARS - 1)).'…';
            }
            $key = mb_strtolower($label);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $label;
            if (count($out) >= self::MAX_ITEMS) {
                break;
            }
        }

        return $out;
    }
}
