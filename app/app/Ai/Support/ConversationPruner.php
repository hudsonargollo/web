<?php

namespace App\Ai\Support;

use App\Ai\Data\ChatMessage;

/**
 * Shrink conversation payloads before they hit the provider.
 *
 * Policy: only the last ~2 steps (KEEP_RECENT messages) keep tool payloads;
 * older Read / list_dir / compile dumps collapse to short stubs.
 */
final class ConversationPruner
{
    /** Keep this many trailing messages (~2 user/assistant steps). */
    public const KEEP_RECENT = 4;

    /** Soft cap per older message (chars). */
    public const MAX_OLDER_CHARS = 600;

    /** Soft cap even for recent messages (chars). */
    public const MAX_RECENT_CHARS = 8_000;

    /** Cap for stale [TOOL_RESULTS] stubs. */
    public const MAX_STALE_TOOL_CHARS = 360;

    /**
     * @param  list<ChatMessage>  $messages
     * @return list<ChatMessage>
     */
    public function prune(array $messages, int $keepRecent = self::KEEP_RECENT): array
    {
        $rows = array_values($messages);
        $count = count($rows);
        if ($count === 0) {
            return [];
        }

        $keep = max(2, $keepRecent);
        $cut = max(0, $count - $keep);
        $out = [];

        for ($i = 0; $i < $count; $i++) {
            $message = $rows[$i];
            $content = (string) $message->content;
            $isRecent = $i >= $cut;
            // Within the recent window, still stub TOOL_RESULTS that are not the latest message.
            $isLatest = $i === ($count - 1);
            $pruned = $isRecent
                ? $this->pruneRecent($content, keepToolBodies: $isLatest || ($i >= $count - 2))
                : $this->pruneOlder($content);

            $out[] = new ChatMessage($message->role, $pruned);
        }

        return $out;
    }

    private function pruneRecent(string $content, bool $keepToolBodies): string
    {
        $trimmed = trim($content);
        if ($trimmed !== '' && str_contains($trimmed, '[TOOL_RESULTS') && ! $keepToolBodies) {
            return $this->summarizeToolResults($trimmed);
        }

        $stripped = $this->stripHeavyJsonFields($content, keepPreview: $keepToolBodies);
        $stripped = $this->stripDirectoryScans($stripped, aggressive: ! $keepToolBodies);

        if (strlen($stripped) <= self::MAX_RECENT_CHARS) {
            return $stripped;
        }

        return $this->hardTruncate($stripped, self::MAX_RECENT_CHARS);
    }

    private function pruneOlder(string $content): string
    {
        $trimmed = trim($content);
        if ($trimmed === '') {
            return '';
        }

        if (str_contains($trimmed, '[TOOL_RESULTS')) {
            return $this->summarizeToolResults($trimmed);
        }

        // Compile / preview / shell dumps from older turns.
        if (preg_match('/\[(SYSTEM AUTO-REPAIR|COMPILE|RUNTIME ERROR|VFS_HEAL|SHELL)/i', $trimmed)) {
            return $this->hardTruncate(
                preg_replace('/\s+/', ' ', $trimmed) ?? $trimmed,
                self::MAX_OLDER_CHARS,
            );
        }

        $stripped = $this->stripDirectoryScans(
            $this->stripHeavyJsonFields($trimmed, keepPreview: false),
            aggressive: true,
        );

        if (strlen($stripped) > self::MAX_OLDER_CHARS) {
            return $this->hardTruncate($stripped, self::MAX_OLDER_CHARS);
        }

        return $stripped;
    }

    private function summarizeToolResults(string $content): string
    {
        $round = null;
        if (preg_match('/\[TOOL_RESULTS\s*[—\-]\s*round\s*(\d+)/u', $content, $m)) {
            $round = $m[1];
        }

        $tools = null;
        if (preg_match('/Previous tools:\s*(.+)/u', $content, $m)) {
            $tools = trim($m[1]);
        }

        $statuses = [];
        if (preg_match_all('/"status"\s*:\s*"([^"]+)"/', $content, $m)) {
            $statuses = array_slice($m[1], 0, 6);
        }

        $hint = $round !== null ? "round {$round}" : 'prior round';
        $toolBit = $tools ? "; tools={$tools}" : '';
        $statusBit = $statuses !== [] ? '; statuses='.implode(',', $statuses) : '';

        $summary = "[TOOL_RESULTS pruned — {$hint}{$toolBit}{$statusBit}] Stale list_dir/read/compile payloads dropped. Re-read if needed.";

        return $this->hardTruncate($summary, self::MAX_STALE_TOOL_CHARS);
    }

    /**
     * Collapse list_dir / file_search item arrays so historical VFS scans do not resend.
     */
    private function stripDirectoryScans(string $content, bool $aggressive): string
    {
        $limit = $aggressive ? 0 : 8;
        $patterns = [
            '/("items"\s*:\s*)(\[[^\]]*\])/us',
            '/("hits"\s*:\s*)(\[[^\]]*\])/us',
            '/("entries"\s*:\s*)(\[[^\]]*\])/us',
        ];

        $out = $content;
        foreach ($patterns as $pattern) {
            $out = preg_replace_callback($pattern, function (array $m) use ($limit) {
                $decoded = json_decode($m[2], true);
                if (! is_array($decoded)) {
                    return $m[1].'[]';
                }
                if ($limit <= 0) {
                    $count = count($decoded);

                    return $m[1].json_encode(['_pruned' => true, 'count' => $count], JSON_UNESCAPED_SLASHES);
                }
                $slice = array_slice($decoded, 0, $limit);
                if (count($decoded) > $limit) {
                    $slice[] = ['_pruned' => true, 'omitted' => count($decoded) - $limit];
                }

                return $m[1].(json_encode($slice, JSON_UNESCAPED_SLASHES) ?: '[]');
            }, $out) ?? $out;
        }

        return $out;
    }

    /**
     * Drop bulky observation artifact fields from JSON lines embedded in messages.
     */
    private function stripHeavyJsonFields(string $content, bool $keepPreview): string
    {
        $patterns = [
            '/("contentPreview"\s*:\s*")((?:\\\\.|[^"\\\\])*)(")/u',
            '/("exactSnippet"\s*:\s*")((?:\\\\.|[^"\\\\])*)(")/u',
            '/("fullContent"\s*:\s*")((?:\\\\.|[^"\\\\])*)(")/u',
            '/("content"\s*:\s*")((?:\\\\.|[^"\\\\])*)(")/u',
        ];

        $out = $content;
        foreach ($patterns as $i => $pattern) {
            $out = preg_replace_callback($pattern, function (array $m) use ($keepPreview, $i) {
                $raw = stripcslashes($m[2]);
                $limit = ($keepPreview && $i === 0) ? 1_600 : 80;
                if (strlen($raw) <= $limit) {
                    return $m[0];
                }
                $slice = substr($raw, 0, $limit);

                return $m[1].addcslashes($slice.'…[pruned]', "\\\"\n\r\t").$m[3];
            }, $out) ?? $out;
        }

        return $out;
    }

    private function hardTruncate(string $content, int $max): string
    {
        if (strlen($content) <= $max) {
            return $content;
        }

        return substr($content, 0, max(0, $max - 1)).'…';
    }
}
