<?php

namespace App\Datastore;

/**
 * Classifies SQL before it reaches a live data plane.
 * Catastrophic statements are refused. Destructive ones need an explicit ack.
 */
final class SqlFence
{
    /**
     * @return array{
     *     blocked: bool,
     *     reason: string|null,
     *     destructive: bool,
     *     statements: list<string>
     * }
     */
    public function inspect(string $sql): array
    {
        $statements = $this->split($this->stripComments($sql));
        if ($statements === []) {
            return [
                'blocked' => true,
                'reason' => 'No SQL statements to apply.',
                'destructive' => false,
                'statements' => [],
            ];
        }

        foreach ($statements as $statement) {
            $reason = $this->blockedReason($statement);
            if ($reason !== null) {
                return [
                    'blocked' => true,
                    'reason' => $reason,
                    'destructive' => true,
                    'statements' => $statements,
                ];
            }
        }

        $destructive = false;
        foreach ($statements as $statement) {
            if ($this->looksDestructive($statement)) {
                $destructive = true;
                break;
            }
        }

        return [
            'blocked' => false,
            'reason' => null,
            'destructive' => $destructive,
            'statements' => $statements,
        ];
    }

    /**
     * @return list<string>
     */
    public function split(string $sql): array
    {
        $out = [];
        $buffer = '';
        $quote = null;
        $length = strlen($sql);

        for ($i = 0; $i < $length; $i++) {
            $char = $sql[$i];
            $prev = $i > 0 ? $sql[$i - 1] : '';

            if ($quote !== null) {
                $buffer .= $char;
                if ($char === $quote && $prev !== '\\') {
                    $quote = null;
                }

                continue;
            }

            if ($char === "'" || $char === '"' || $char === '`') {
                $quote = $char;
                $buffer .= $char;

                continue;
            }

            if ($char === ';') {
                $trimmed = trim($buffer);
                if ($trimmed !== '') {
                    $out[] = $trimmed;
                }
                $buffer = '';

                continue;
            }

            $buffer .= $char;
        }

        $tail = trim($buffer);
        if ($tail !== '') {
            $out[] = $tail;
        }

        return $out;
    }

    private function blockedReason(string $statement): ?string
    {
        $flat = $this->flatten($statement);

        $rules = [
            '/\bdrop\s+database\b/' => 'DROP DATABASE is not allowed.',
            '/\bdrop\s+schema\b/' => 'DROP SCHEMA is not allowed.',
            '/\bcreate\s+database\b/' => 'CREATE DATABASE is not allowed.',
            '/\balter\s+system\b/' => 'ALTER SYSTEM is not allowed.',
            '/\bcopy\b.+\bprogram\b/' => 'COPY … PROGRAM is not allowed.',
            '/\bpg_read_file\s*\(/' => 'Filesystem helpers are not allowed.',
            '/\bpg_write_file\s*\(/' => 'Filesystem helpers are not allowed.',
            '/\bpg_ls_dir\s*\(/' => 'Filesystem helpers are not allowed.',
            '/\blo_import\s*\(/' => 'Large-object import is not allowed.',
            '/\blo_export\s*\(/' => 'Large-object export is not allowed.',
            '/\bset\s+role\b/' => 'SET ROLE is not allowed.',
            '/\bset\s+session\s+authorization\b/' => 'SET SESSION AUTHORIZATION is not allowed.',
            '/\bdblink\b/' => 'dblink is not allowed.',
            '/\btruncate\s+auth\./' => 'Truncating auth schema tables is not allowed.',
            '/\bdrop\s+table\s+(if\s+exists\s+)?auth\./' => 'Dropping auth schema tables is not allowed.',
            '/\bdelete\s+from\s+auth\./' => 'Deleting auth schema rows is not allowed.',
        ];

        foreach ($rules as $pattern => $reason) {
            if (preg_match($pattern, $flat) === 1) {
                return $reason;
            }
        }

        return null;
    }

    private function looksDestructive(string $statement): bool
    {
        $flat = $this->flatten($statement);

        return preg_match('/\b(drop|truncate|delete|alter|grant|revoke)\b/', $flat) === 1;
    }

    private function flatten(string $sql): string
    {
        return strtolower(preg_replace('/\s+/u', ' ', trim($sql)) ?? '');
    }

    private function stripComments(string $sql): string
    {
        $withoutBlock = preg_replace('/\/\*.*?\*\//s', ' ', $sql) ?? $sql;

        $lines = preg_split('/\R/u', $withoutBlock) ?: [];
        $kept = [];
        foreach ($lines as $line) {
            $kept[] = preg_replace('/--.*$/u', '', $line) ?? $line;
        }

        return implode("\n", $kept);
    }
}
