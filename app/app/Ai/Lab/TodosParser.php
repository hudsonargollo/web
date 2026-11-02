<?php

namespace App\Ai\Lab;

/**
 * Extracts proactive high-level turn plans from assistant content and strips
 * the <todos>…</todos> tag so it never reaches chat history.
 *
 * Expected form (JSON array of objects):
 * <todos>[{"id":1,"task":"Update state in App.jsx"},{"id":2,"task":"Add meta in index.html"}]</todos>
 */
final class TodosParser
{
    private const MAX_ITEMS = 8;

    private const MAX_TASK_CHARS = 120;

    /**
     * @return array{content: string, todos: list<array{id: string, task: string}>}
     */
    public function parse(string $content): array
    {
        $todos = [];
        $clean = $content;

        if (preg_match_all('/<todos>\s*([\s\S]*?)\s*<\/todos>/iu', $clean, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                foreach ($this->decodeList((string) ($match[1] ?? '')) as $item) {
                    $todos[] = $item;
                }
            }
            $clean = preg_replace('/\s*<todos>\s*[\s\S]*?\s*<\/todos>\s*/iu', "\n", $clean) ?? $clean;
        }

        // Unclosed tag — drop remainder so markup never paints in chat.
        if (preg_match('/<todos>\s*([\s\S]*)$/iu', $clean, $open)) {
            foreach ($this->decodeList((string) ($open[1] ?? '')) as $item) {
                $todos[] = $item;
            }
            $clean = preg_replace('/\s*<todos>\s*[\s\S]*$/iu', '', $clean) ?? $clean;
        }

        $clean = preg_replace('/\s*<\/todos>\s*/iu', "\n", $clean) ?? $clean;
        $clean = preg_replace("/[ \t]+\n/", "\n", $clean) ?? $clean;
        $clean = preg_replace("/\n{3,}/", "\n\n", $clean) ?? $clean;

        return [
            'content' => trim($clean),
            'todos' => $this->normalizeList($todos),
        ];
    }

    /**
     * @return list<array{id: string, task: string}>
     */
    private function decodeList(string $raw): array
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return [];
        }

        $decoded = json_decode($trimmed, true);
        if (! is_array($decoded)) {
            return [];
        }

        $items = [];
        foreach ($decoded as $index => $value) {
            if (is_string($value) || is_numeric($value)) {
                $items[] = [
                    'id' => (string) ((int) $index + 1),
                    'task' => (string) $value,
                ];

                continue;
            }

            if (! is_array($value)) {
                continue;
            }

            $task = $value['task'] ?? $value['label'] ?? $value['text'] ?? null;
            if (! is_string($task) && ! is_numeric($task)) {
                continue;
            }

            $id = $value['id'] ?? ((int) $index + 1);
            $items[] = [
                'id' => (string) $id,
                'task' => (string) $task,
            ];
        }

        return $items;
    }

    /**
     * @param  list<array{id: string, task: string}>  $items
     * @return list<array{id: string, task: string}>
     */
    private function normalizeList(array $items): array
    {
        $out = [];
        $seenIds = [];
        $seenTasks = [];

        foreach ($items as $index => $item) {
            $task = trim(preg_replace('/\s+/u', ' ', (string) ($item['task'] ?? '')) ?? '');
            if ($task === '') {
                continue;
            }
            if (mb_strlen($task) > self::MAX_TASK_CHARS) {
                $task = rtrim(mb_substr($task, 0, self::MAX_TASK_CHARS - 1)).'…';
            }

            $taskKey = mb_strtolower($task);
            if (isset($seenTasks[$taskKey])) {
                continue;
            }

            $id = trim((string) ($item['id'] ?? ''));
            if ($id === '' || isset($seenIds[$id])) {
                $id = (string) (count($out) + 1);
            }

            $seenIds[$id] = true;
            $seenTasks[$taskKey] = true;
            $out[] = [
                'id' => $id,
                'task' => $task,
            ];

            if (count($out) >= self::MAX_ITEMS) {
                break;
            }
        }

        return $out;
    }
}
