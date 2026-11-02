<?php

namespace App\Ai\Lab;

/**
 * Hidden LLM payload for preview context-menu / inspect edits.
 * Chat UI stores only the user's typed text + previewEdits metadata.
 */
final class PreviewEditPrompt
{
    /**
     * @param  list<array<string, mixed>>  $targets
     */
    public static function format(array $targets, string $userText = ''): string
    {
        $normalized = self::normalize($targets);
        if ($normalized === []) {
            return '';
        }

        $requested = trim($userText);
        $blocks = [];

        foreach ($normalized as $index => $target) {
            $el = is_array($target['element'] ?? null) ? $target['element'] : [];
            $action = (string) ($target['action'] ?? 'edit');
            $tag = (string) ($el['tag'] ?? 'div');
            $path = (string) ($el['path'] ?? '');
            $lines = [
                ($index + 1).'. '.(string) ($target['kind'] ?? 'box').' <'.$tag.'> action='.$action.' '.$path,
            ];

            $current = trim((string) ($el['text'] ?? ''));
            if ($current !== '') {
                $lines[] = 'current text: "'.$current.'"';
            }

            $attrs = is_array($el['attributes'] ?? null) ? $el['attributes'] : [];
            foreach (['href', 'src', 'alt', 'placeholder'] as $key) {
                $value = trim((string) ($attrs[$key] ?? ''));
                if ($value !== '') {
                    $lines[] = $key.': '.$value;
                }
            }

            $applied = is_array($target['applied'] ?? null) ? $target['applied'] : [];
            $appliedText = array_key_exists('text', $applied) ? trim((string) $applied['text']) : '';
            if ($appliedText !== '') {
                $lines[] = 'LIVE PREVIEW already shows text: "'.$appliedText.'" — persist this in source.';
            }
            if (isset($applied['attrs']) && is_array($applied['attrs']) && $applied['attrs'] !== []) {
                $lines[] = 'LIVE PREVIEW attrs: '.json_encode($applied['attrs']).' — persist in source.';
            }
            if (isset($applied['styles']) && is_array($applied['styles']) && $applied['styles'] !== []) {
                $lines[] = 'LIVE PREVIEW styles: '.json_encode($applied['styles']).' — persist in source.';
            }

            $copyActions = ['change-text', 'change-link', 'change-src', 'change-alt', 'change-placeholder', 'change-value'];
            if (in_array($action, $copyActions, true) && $requested !== '' && $appliedText === '') {
                $field = match ($action) {
                    'change-link' => 'href',
                    'change-src' => 'src',
                    'change-alt' => 'alt',
                    'change-placeholder' => 'placeholder',
                    'change-value' => 'value',
                    default => 'text',
                };
                $lines[] = 'requested new '.$field.' (use this exact copy, do not paraphrase): "'.$requested.'"';
                $lines[] = 'Replace the current '.$field.' in the source file with that exact string via write_file.';
            } elseif ($requested !== '' && $applied === []) {
                $lines[] = 'User request: "'.$requested.'"';
                $lines[] = 'Apply this in VFS with write_file.';
            } elseif ($applied === []) {
                $lines[] = 'Apply the user message in VFS with write_file.';
            }

            $blocks[] = implode("\n", $lines);
        }

        return "[Preview targets — edit these elements in the source files with write_file. Do not only restyle the live DOM.]\n".implode("\n\n", $blocks);
    }

    /**
     * @param  list<array<string, mixed>>  $targets
     * @return list<array<string, mixed>>
     */
    public static function normalize(array $targets): array
    {
        $out = [];
        foreach (array_slice($targets, 0, 8) as $row) {
            if (! is_array($row)) {
                continue;
            }
            $element = is_array($row['element'] ?? null) ? $row['element'] : [];
            $attrs = is_array($element['attributes'] ?? null) ? $element['attributes'] : [];
            $applied = is_array($row['applied'] ?? null) ? $row['applied'] : null;

            $out[] = [
                'id' => (string) ($row['id'] ?? ''),
                'kind' => (string) ($row['kind'] ?? 'box'),
                'icon' => (string) ($row['icon'] ?? 'card'),
                'action' => (string) ($row['action'] ?? 'edit'),
                'title' => (string) ($row['title'] ?? 'Card'),
                'snippet' => self::clip((string) ($row['snippet'] ?? ''), 120),
                'element' => [
                    'uid' => $element['uid'] ?? null,
                    'tag' => (string) ($element['tag'] ?? 'div'),
                    'id' => $element['id'] ?? null,
                    'className' => self::clip((string) ($element['className'] ?? ''), 160),
                    'path' => self::clip((string) ($element['path'] ?? ''), 240),
                    'text' => self::clip((string) ($element['text'] ?? ''), 240),
                    'attributes' => [
                        'href' => isset($attrs['href']) ? self::clip((string) $attrs['href'], 500) : null,
                        'src' => isset($attrs['src']) ? self::clip((string) $attrs['src'], 500) : null,
                        'alt' => isset($attrs['alt']) ? self::clip((string) $attrs['alt'], 240) : null,
                        'placeholder' => isset($attrs['placeholder']) ? self::clip((string) $attrs['placeholder'], 240) : null,
                    ],
                ],
                'applied' => $applied,
            ];
        }

        return $out;
    }

    private static function clip(string $value, int $max): string
    {
        if (function_exists('mb_substr')) {
            return mb_substr($value, 0, $max);
        }

        return substr($value, 0, $max);
    }
}
