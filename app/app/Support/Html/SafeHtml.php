<?php

namespace App\Support\Html;

final class SafeHtml
{
    /**
     * Allowlisted markup for legal pages and the workspace editor.
     */
    public static function document(string $html): string
    {
        $clean = preg_replace('#<(script|style)\b[^>]*>.*?</\1>#is', '', $html) ?? $html;
        $clean = strip_tags($clean, [
            'p', 'br', 'div', 'span',
            'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'mark',
            'h1', 'h2', 'h3', 'h4',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'a', 'img', 'hr',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'sub', 'sup',
        ]);

        $clean = preg_replace('/\s+on\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $clean) ?? $clean;
        $clean = preg_replace('/javascript\s*:/i', '', $clean) ?? $clean;
        $clean = preg_replace_callback('/\s(href|src)\s*=\s*("|\')(.*?)\2/i', function (array $match): string {
            $url = html_entity_decode((string) $match[3], ENT_QUOTES, 'UTF-8');
            $ok = (bool) preg_match('#^(https?:)?//#i', $url) || str_starts_with($url, '/');

            return $ok ? ' '.$match[1].'='.$match[2].$match[3].$match[2] : '';
        }, $clean) ?? $clean;
        $clean = preg_replace_callback('/\sstyle\s*=\s*("|\')(.*?)\1/i', function (array $match): string {
            $allowed = [];
            foreach (explode(';', (string) $match[2]) as $declaration) {
                [$property] = array_map('trim', explode(':', $declaration, 2) + ['', '']);
                if (in_array(strtolower($property), ['text-align', 'text-decoration'], true)) {
                    $allowed[] = trim($declaration);
                }
            }

            return $allowed === [] ? '' : ' style="'.implode('; ', $allowed).'"';
        }, $clean) ?? $clean;

        return $clean;
    }

    public static function hasCopy(string $html): bool
    {
        return self::plain($html) !== '';
    }

    public static function plain(string $html): string
    {
        return trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES, 'UTF-8')) ?? '');
    }
}
