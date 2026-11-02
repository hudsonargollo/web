<?php

namespace App\Ai\Lab;

use App\Ai\Data\ToolCall;

/**
 * Safety net: recover native ToolCall objects when a model dumps tool JSON
 * into assistant text instead of the provider's tool_calls channel.
 */
final class PseudoToolCallParser
{
    /** @var list<string> */
    private const ALLOWED = [
        'list_dir',
        'file_search',
        'grep',
        'read_file',
        'write_file',
        'lookup_visuals',
        'survey_datastore',
        'revise_datastore',
        'github_status',
        'github_compare',
        'github_push',
        'github_pull',
        'github_fork',
        'github_link',
        'github_create_repo',
    ];

    /**
     * @param  list<ToolCall>  $existing
     * @param  array<string, string>  $vfsContents  Existing workspace files (path → body)
     * @return array{toolCalls: list<ToolCall>, content: string, recovered: bool}
     */
    public function recover(string $content, array $existing = [], array $vfsContents = []): array
    {
        $existing = array_values(array_filter(
            $existing,
            static fn ($call): bool => $call instanceof ToolCall && $call->name !== '',
        ));

        if ($existing !== []) {
            return [
                'toolCalls' => $existing,
                'content' => $content,
                'recovered' => false,
            ];
        }

        $raw = (string) $content;
        if (trim($raw) === '') {
            return [
                'toolCalls' => [],
                'content' => $raw,
                'recovered' => false,
            ];
        }

        $vfs = $this->normalizeVfsMap($vfsContents);
        $found = [];
        $spans = [];

        foreach ($this->extractJsonCandidates($raw) as $candidate) {
            $calls = $this->toolCallsFromDecoded($candidate['value']);
            if ($calls === []) {
                continue;
            }
            foreach ($calls as $call) {
                $found[] = $call;
            }
            $spans[] = [$candidate['start'], $candidate['end']];
        }

        // invoke write_file with {...} / write_file({...})
        foreach ($this->extractFunctionStyleCalls($raw) as $candidate) {
            $found[] = $candidate['call'];
            $spans[] = [$candidate['start'], $candidate['end']];
        }

        // Markdown fences with path meta → write_file
        foreach ($this->extractFencedFileWrites($raw, $vfs) as $candidate) {
            $found[] = $candidate['call'];
            $spans[] = [$candidate['start'], $candidate['end']];
        }

        // Prose “Wrote App.jsx” / “Updated App.jsx” + following fence
        foreach ($this->extractProseWriteFences($raw, $vfs) as $candidate) {
            $found[] = $candidate['call'];
            $spans[] = [$candidate['start'], $candidate['end']];
        }

        // Standalone unified diffs after “Updated path”
        foreach ($this->extractStandaloneDiffs($raw, $vfs) as $candidate) {
            $found[] = $candidate['call'];
            $spans[] = [$candidate['start'], $candidate['end']];
        }

        // XML-style pseudo tools (<write_file><path>…</path><content>…</content></write_file>)
        foreach ($this->extractXmlStyleCalls($raw, $vfs) as $candidate) {
            $found[] = $candidate['call'];
            $spans[] = [$candidate['start'], $candidate['end']];
        }

        if ($found === []) {
            return [
                'toolCalls' => [],
                'content' => $raw,
                'recovered' => false,
            ];
        }

        // Dedupe by name+args fingerprint (keep first).
        $unique = [];
        $seen = [];
        foreach ($found as $call) {
            $key = $call->name.'|'.md5(json_encode($call->arguments) ?: '');
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $unique[] = $call;
        }

        $clean = $this->stripSpans($raw, $spans);
        $clean = preg_replace("/\n{3,}/", "\n\n", $clean) ?? $clean;

        return [
            'toolCalls' => $unique,
            'content' => trim($clean),
            'recovered' => true,
        ];
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, string>
     */
    private function normalizeVfsMap(array $raw): array
    {
        $out = [];
        foreach ($raw as $key => $value) {
            $path = $this->normalizeWritePath((string) $key);
            if ($path === '') {
                continue;
            }
            $out[$path] = $value === null ? '' : (string) $value;
        }

        return $out;
    }

    /**
     * @return list<array{value: mixed, start: int, end: int}>
     */
    private function extractJsonCandidates(string $raw): array
    {
        $out = [];

        // Fenced blocks first (```json … ``` / ```tool … ```).
        if (preg_match_all('/```(?:json|tool[_-]?call|tools?)?\s*\n([\s\S]*?)```/iu', $raw, $matches, PREG_OFFSET_CAPTURE)) {
            foreach ($matches[1] as $i => $body) {
                $decoded = json_decode(trim((string) $body[0]), true);
                if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
                    continue;
                }
                $full = $matches[0][$i];
                $out[] = [
                    'value' => $decoded,
                    'start' => (int) $full[1],
                    'end' => (int) $full[1] + strlen((string) $full[0]),
                ];
            }
        }

        $len = strlen($raw);
        for ($i = 0; $i < $len; $i++) {
            $ch = $raw[$i];
            if ($ch !== '{' && $ch !== '[') {
                continue;
            }
            $sliced = $this->sliceBalancedJson($raw, $i);
            if ($sliced === null) {
                continue;
            }
            [$json, $end] = $sliced;
            if (! preg_match('/"(?:name|tool|function)"\s*:/u', $json)) {
                $i = $end;

                continue;
            }
            $decoded = json_decode($json, true);
            if (is_array($decoded)) {
                $out[] = [
                    'value' => $decoded,
                    'start' => $i,
                    'end' => $end + 1,
                ];
            }
            $i = $end;
        }

        return $out;
    }

    /**
     * @return array{0: string, 1: int}|null
     */
    private function sliceBalancedJson(string $raw, int $start): ?array
    {
        $open = $raw[$start];
        $close = $open === '{' ? '}' : ']';
        $depth = 0;
        $inString = false;
        $escape = false;
        $len = strlen($raw);

        for ($i = $start; $i < $len; $i++) {
            $ch = $raw[$i];
            if ($inString) {
                if ($escape) {
                    $escape = false;

                    continue;
                }
                if ($ch === '\\') {
                    $escape = true;

                    continue;
                }
                if ($ch === '"') {
                    $inString = false;
                }

                continue;
            }
            if ($ch === '"') {
                $inString = true;

                continue;
            }
            if ($ch === $open) {
                $depth++;
            } elseif ($ch === $close) {
                $depth--;
                if ($depth === 0) {
                    return [substr($raw, $start, $i - $start + 1), $i];
                }
            }
        }

        return null;
    }

    /**
     * @return list<ToolCall>
     */
    private function toolCallsFromDecoded(mixed $decoded): array
    {
        if (! is_array($decoded)) {
            return [];
        }

        // List of calls
        if (array_is_list($decoded)) {
            $out = [];
            foreach ($decoded as $row) {
                $call = $this->toolCallFromRow(is_array($row) ? $row : null);
                if ($call !== null) {
                    $out[] = $call;
                }
            }

            return $out;
        }

        // { "tool_calls": [ ... ] }
        if (isset($decoded['tool_calls']) && is_array($decoded['tool_calls'])) {
            return $this->toolCallsFromDecoded($decoded['tool_calls']);
        }

        $single = $this->toolCallFromRow($decoded);

        return $single !== null ? [$single] : [];
    }

    /**
     * @param  array<string, mixed>|null  $row
     */
    private function toolCallFromRow(?array $row): ?ToolCall
    {
        if ($row === null) {
            return null;
        }

        $name = (string) (
            $row['name']
            ?? $row['tool']
            ?? data_get($row, 'function.name')
            ?? $row['function']
            ?? ''
        );
        $name = trim($name);
        if ($name === 'patch_file' || $name === 'apply_patch') {
            $name = 'write_file';
        }
        if ($name === '' || ! in_array($name, self::ALLOWED, true)) {
            return null;
        }

        $arguments = $row['arguments']
            ?? $row['parameters']
            ?? $row['input']
            ?? data_get($row, 'function.arguments')
            ?? [];

        if (is_string($arguments)) {
            $decoded = json_decode($arguments, true);
            $arguments = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($arguments)) {
            $arguments = [];
        }

        // Legacy apply_patch payloads → write_file with best-effort full body.
        if ($name === 'write_file' && ! array_key_exists('content', $arguments)) {
            $legacy = $arguments['full_content'] ?? $arguments['fullContent'] ?? $arguments['replace'] ?? null;
            if ($legacy !== null) {
                $arguments['content'] = (string) $legacy;
            }
        }

        // write_file needs path at minimum
        if (in_array($name, ['write_file', 'read_file', 'list_dir'], true)) {
            if (! isset($arguments['path']) || trim((string) $arguments['path']) === '') {
                return null;
            }
        }
        if ($name === 'write_file' && ! array_key_exists('content', $arguments)) {
            return null;
        }
        if ($name === 'lookup_visuals' && trim((string) ($arguments['query'] ?? '')) === '') {
            return null;
        }
        if ($name === 'revise_datastore' && trim((string) ($arguments['sql'] ?? '')) === '') {
            return null;
        }

        return new ToolCall(
            id: (string) ($row['id'] ?? uniqid('pseudo_', true)),
            name: $name,
            arguments: $arguments,
        );
    }

    /**
     * @return list<array{call: ToolCall, start: int, end: int}>
     */
    private function extractFunctionStyleCalls(string $raw): array
    {
        $out = [];
        $names = implode('|', array_map('preg_quote', [...self::ALLOWED, 'patch_file', 'apply_patch']));
        $pattern = '/\b('.$names.')\s*\(\s*(\{)/u';

        if (! preg_match_all($pattern, $raw, $matches, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        foreach ($matches[0] as $i => $full) {
            $name = (string) ($matches[1][$i][0] ?? '');
            if ($name === 'patch_file' || $name === 'apply_patch') {
                $name = 'write_file';
            }
            $argsStart = (int) $matches[2][$i][1];
            $sliced = $this->sliceBalancedJson($raw, $argsStart);
            if ($sliced === null) {
                continue;
            }
            [$json, $end] = $sliced;
            $decoded = json_decode($json, true);
            if (! is_array($decoded)) {
                continue;
            }
            $call = $this->toolCallFromRow([
                'name' => $name,
                'arguments' => $decoded,
            ]);
            if ($call === null) {
                continue;
            }
            $out[] = [
                'call' => $call,
                'start' => (int) $full[1],
                'end' => $end + 1,
            ];
        }

        return $out;
    }

    /**
     * ```jsx src/App.jsx\n…``` / ```src/App.jsx\n…``` → write_file
     *
     * @param  array<string, string>  $vfs
     * @return list<array{call: ToolCall, start: int, end: int}>
     */
    private function extractFencedFileWrites(string $raw, array $vfs): array
    {
        $out = [];
        if (! preg_match_all('/```([^\n`]*)\n([\s\S]*?)```/u', $raw, $matches, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        foreach ($matches[0] as $i => $full) {
            $meta = trim((string) ($matches[1][$i][0] ?? ''));
            $body = rtrim((string) ($matches[2][$i][0] ?? ''), "\n");
            if ($meta === '' || trim($body) === '') {
                continue;
            }

            $parts = preg_split('/\s+/', $meta) ?: [];
            $path = null;
            foreach ($parts as $part) {
                if (str_contains($part, '/') || preg_match('/\.(jsx?|tsx?|css|html|json|md|svg)$/i', $part)) {
                    $path = $part;
                    break;
                }
            }
            if ($path === null && count($parts) === 1 && str_contains($parts[0], '.')) {
                $path = $parts[0];
            }
            if ($path === null || $path === '') {
                continue;
            }

            $call = $this->fileBodyToToolCall($path, $body, $vfs);
            if ($call === null) {
                continue;
            }

            $out[] = [
                'call' => $call,
                'start' => (int) $full[1],
                'end' => (int) $full[1] + strlen((string) $full[0]),
            ];
        }

        return $out;
    }

    /**
     * Wrote|Writing|Write|Updated path + following fence → write_file
     *
     * @param  array<string, string>  $vfs
     * @return list<array{call: ToolCall, start: int, end: int}>
     */
    private function extractProseWriteFences(string $raw, array $vfs): array
    {
        $out = [];
        $pattern = '/\b(?:Wrote|Writing|Write|Updated?|Updating|Creating|Created|Modified|Fixed|Patched|Changed)\s+[\'"`]?([^\s\'"`]+?\.(?:jsx?|tsx?|css|html|json|md|svg))[\'"`]?[^\n]*\n+```([^\n`]*)\n([\s\S]*?)```/iu';
        if (! preg_match_all($pattern, $raw, $matches, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        foreach ($matches[0] as $i => $full) {
            $pathHint = (string) ($matches[1][$i][0] ?? '');
            $meta = trim((string) ($matches[2][$i][0] ?? ''));
            $body = rtrim((string) ($matches[3][$i][0] ?? ''), "\n");
            if ($pathHint === '' || trim($body) === '') {
                continue;
            }

            $path = $pathHint;
            if ($meta !== '') {
                foreach (preg_split('/\s+/', $meta) ?: [] as $part) {
                    if (str_contains($part, '/') || str_contains($part, '.')) {
                        $path = $part;
                        break;
                    }
                }
            }

            $call = $this->fileBodyToToolCall($path, $body, $vfs);
            if ($call === null) {
                continue;
            }

            $out[] = [
                'call' => $call,
                'start' => (int) $full[1],
                'end' => (int) $full[1] + strlen((string) $full[0]),
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $vfs
     * @return list<array{call: ToolCall, start: int, end: int}>
     */
    private function extractXmlStyleCalls(string $raw, array $vfs): array
    {
        $out = [];
        $names = implode('|', array_map('preg_quote', self::ALLOWED));
        $pattern = '/<('.$names.')>\s*(?:<path>([^<]+)<\/path>\s*)?(?:<content>([\s\S]*?)<\/content>\s*)?<\/\1>/iu';

        if (! preg_match_all($pattern, $raw, $matches, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        foreach ($matches[0] as $i => $full) {
            $name = trim((string) ($matches[1][$i][0] ?? ''));
            $path = trim((string) ($matches[2][$i][0] ?? ''));
            $content = (string) ($matches[3][$i][0] ?? '');

            if ($name === '') {
                continue;
            }

            $arguments = [];
            if ($path !== '') {
                $arguments['path'] = $path;
            }
            if ($content !== '') {
                $arguments['content'] = $content;
            }

            if ($name === 'write_file') {
                $call = $this->fileBodyToToolCall($path, $content, $vfs);
            } else {
                $call = $this->toolCallFromRow([
                    'name' => $name,
                    'arguments' => $arguments,
                ]);
            }

            if ($call === null) {
                continue;
            }

            $out[] = [
                'call' => $call,
                'start' => (int) $full[1],
                'end' => (int) $full[1] + strlen((string) $full[0]),
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $vfs
     * @return list<array{call: ToolCall, start: int, end: int}>
     */
    private function extractStandaloneDiffs(string $raw, array $vfs): array
    {
        $out = [];
        $pattern = '/\b(?:Updated?|Updating|Modified|Fixed|Patched|Changed)\s+[\'"`]?([^\s\'"`]+?\.(?:jsx?|tsx?|css|html|json|md|svg))[\'"`]?[^\n]*\n+(?=diff --git |@@ |\+\+\+ |--- )([\s\S]*?)(?=\n\n[A-Z]|\n\n```|$)/iu';
        if (! preg_match_all($pattern, $raw, $matches, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        foreach ($matches[0] as $i => $full) {
            $path = (string) ($matches[1][$i][0] ?? '');
            $body = trim((string) ($matches[2][$i][0] ?? ''));
            if ($path === '' || ! $this->looksLikeUnifiedDiff($body)) {
                continue;
            }
            $call = $this->fileBodyToToolCall($path, $body, $vfs);
            if ($call === null) {
                continue;
            }
            $out[] = [
                'call' => $call,
                'start' => (int) $full[1],
                'end' => (int) $full[1] + strlen((string) $full[0]),
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $vfs
     */
    private function fileBodyToToolCall(string $rawPath, string $body, array $vfs): ?ToolCall
    {
        $path = $this->normalizeWritePath($rawPath);
        $content = (string) $body;
        if ($path === '' || trim($content) === '') {
            return null;
        }

        $existing = $vfs[$path] ?? '';

        if ($this->looksLikeUnifiedDiff($content)) {
            $patched = $this->applyUnifiedDiff($existing, $content);
            if ($patched !== null && $patched !== $existing) {
                return $this->toolCallFromRow([
                    'name' => 'write_file',
                    'arguments' => ['path' => $path, 'content' => $patched],
                ]);
            }
            // Diff without clean apply — still prefer write_file over inventing apply_patch.
        }

        if ($existing !== '' && $this->looksPartialUpdate($content, $existing)) {
            $merged = $this->mergePartialIntoFile($existing, $content);
            if ($merged !== null && $merged !== $existing) {
                return $this->toolCallFromRow([
                    'name' => 'write_file',
                    'arguments' => ['path' => $path, 'content' => $merged],
                ]);
            }
        }

        return $this->toolCallFromRow([
            'name' => 'write_file',
            'arguments' => ['path' => $path, 'content' => $content],
        ]);
    }

    private function looksLikeUnifiedDiff(string $text): bool
    {
        if (preg_match('/^diff --git |\n@@ |^--- |\+\+\+ /m', $text) === 1) {
            return true;
        }
        $lines = preg_split('/\n/', $text) ?: [];
        $plus = 0;
        $minus = 0;
        foreach ($lines as $line) {
            if (preg_match('/^\+[^+]/', $line) === 1 || $line === '+') {
                $plus++;
            } elseif (preg_match('/^-[^-]/', $line) === 1 || $line === '-') {
                $minus++;
            }
        }
        $total = count($lines);

        return ($plus + $minus) >= 2 && ($plus + $minus) >= (int) floor($total * 0.4);
    }

    private function looksPartialUpdate(string $content, string $existing): bool
    {
        if ($existing === '') {
            return false;
        }
        if (strlen($content) >= (int) (strlen($existing) * 0.85)) {
            return false;
        }
        if ($this->looksLikeUnifiedDiff($content)) {
            return true;
        }
        $hasModule = preg_match('/^\s*(import|export)\s/m', $existing) === 1;
        $contentHasModule = preg_match('/^\s*(import|export)\s/m', $content) === 1;
        if ($hasModule && ! $contentHasModule) {
            return true;
        }
        // Body-only rewrite: existing has imports, snippet does not.
        if (
            preg_match('/^\s*import\s/m', $existing) === 1
            && preg_match('/^\s*import\s/m', $content) !== 1
        ) {
            return true;
        }

        return strlen($content) < (int) (strlen($existing) * 0.55);
    }

    private function mergePartialIntoFile(string $existing, string $partial): ?string
    {
        $body = trim($partial);
        if ($body === '') {
            return null;
        }
        if ($this->looksLikeUnifiedDiff($body)) {
            return $this->applyUnifiedDiff($existing, $body);
        }

        $lines = array_values(array_filter(array_map('trim', explode("\n", $body))));
        if (count($lines) < 2) {
            return null;
        }
        $first = $lines[0];
        $last = $lines[count($lines) - 1];
        $start = strpos($existing, $first);
        if ($start === false) {
            return null;
        }
        $end = strpos($existing, $last, $start);
        if ($end === false || $end < $start) {
            return null;
        }

        return substr($existing, 0, $start).$body.substr($existing, $end + strlen($last));
    }

    private function applyUnifiedDiff(string $existing, string $diffText): ?string
    {
        $lines = explode("\n", str_replace("\r\n", "\n", $diffText));
        $out = explode("\n", $existing);
        $cursor = 0;
        $touched = false;
        $i = 0;
        $count = count($lines);

        while ($i < $count) {
            $line = $lines[$i];
            if (preg_match('/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/', $line, $hunk) === 1) {
                $cursor = max(0, ((int) $hunk[1]) - 1);
                $i++;
                while ($i < $count && ! str_starts_with($lines[$i], '@@ ') && ! str_starts_with($lines[$i], 'diff --git ')) {
                    $row = $lines[$i];
                    if (str_starts_with($row, '+') && ! str_starts_with($row, '+++')) {
                        array_splice($out, $cursor, 0, [substr($row, 1)]);
                        $cursor++;
                        $touched = true;
                    } elseif (str_starts_with($row, '-') && ! str_starts_with($row, '---')) {
                        array_splice($out, $cursor, 1);
                        $touched = true;
                    } elseif (str_starts_with($row, ' ') || $row === '') {
                        $cursor++;
                    }
                    $i++;
                }

                continue;
            }
            $i++;
        }

        if ($touched) {
            return implode("\n", $out);
        }

        $removals = [];
        $additions = [];
        foreach ($lines as $row) {
            if (str_starts_with($row, '+') && ! str_starts_with($row, '+++')) {
                $additions[] = substr($row, 1);
            } elseif (str_starts_with($row, '-') && ! str_starts_with($row, '---')) {
                $removals[] = substr($row, 1);
            }
        }
        if ($removals !== []) {
            $search = implode("\n", $removals);
            if (str_contains($existing, $search)) {
                return str_replace($search, implode("\n", $additions), $existing);
            }
        }

        return null;
    }

    /**
     * @return array{search: string, replace: string}|null
     */
    private function diffToSearchReplace(string $existing, string $diffText): ?array
    {
        $lines = explode("\n", str_replace("\r\n", "\n", $diffText));
        $removals = [];
        $additions = [];
        foreach ($lines as $row) {
            if (str_starts_with($row, '+') && ! str_starts_with($row, '+++')) {
                $additions[] = substr($row, 1);
            } elseif (str_starts_with($row, '-') && ! str_starts_with($row, '---')) {
                $removals[] = substr($row, 1);
            }
        }
        if ($removals === []) {
            return null;
        }
        $search = implode("\n", $removals);
        if (! str_contains($existing, $search)) {
            return null;
        }

        return [
            'search' => $search,
            'replace' => implode("\n", $additions),
        ];
    }

    private function normalizeWritePath(string $path): string
    {
        $path = ltrim(str_replace('\\', '/', trim($path)), '/');
        if ($path !== '' && ! str_contains($path, '/') && preg_match('/\.(jsx?|tsx?|css|html)$/i', $path)) {
            return 'src/'.$path;
        }

        return $path;
    }

    /**
     * @param  list<array{0: int, 1: int}>  $spans
     */
    private function stripSpans(string $raw, array $spans): string
    {
        if ($spans === []) {
            return $raw;
        }

        usort($spans, static fn ($a, $b): int => $b[0] <=> $a[0]);
        $out = $raw;
        foreach ($spans as [$start, $end]) {
            if ($start < 0 || $end <= $start || $end > strlen($out)) {
                continue;
            }
            $out = substr($out, 0, $start).substr($out, $end);
        }

        return $out;
    }
}
