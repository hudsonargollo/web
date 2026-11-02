<?php

namespace App\Ai\Lab;

/**
 * Extracts AI readiness signal for opening the Lab build workspace.
 * Strips machine meta from user-visible assistant content (robust formats).
 */
final class WorkspaceProposalParser
{
    /**
     * @return array{content: string, propose_workspace: bool}
     */
    public function parse(string $content): array
    {
        $propose = false;
        $clean = $content;

        // <<<KRIKKIT_META ... KRIKKIT_META  OR  <<<KRIKKIT_META ... >>>
        if (preg_match('/<<<KRIKKIT_META\s*(.*?)\s*(?:KRIKKIT_META|>>>)/siu', $clean, $match)) {
            $propose = $this->flagFromPayload($match[1]) || $propose;
            $clean = preg_replace('/\s*<<<KRIKKIT_META\s*.*?\s*(?:KRIKKIT_META|>>>)/siu', '', $clean) ?? $clean;
        }

        // Any fenced json/code block containing propose_workspace (not only trailing)
        if (preg_match_all('/```(?:json|javascript|js)?\s*([\s\S]*?)```/iu', $clean, $blocks, PREG_SET_ORDER)) {
            foreach ($blocks as $block) {
                $body = $block[1] ?? '';
                if (! $this->looksLikeProposalPayload($body)) {
                    continue;
                }
                if ($this->flagFromPayload($body)) {
                    $propose = true;
                    $clean = str_replace($block[0], '', $clean);
                }
            }
        }

        // Loose JSON object anywhere
        if (preg_match_all('/\{[^{}]*propose[_ ]?workspace[^{}]*\}/iu', $clean, $objects)) {
            foreach ($objects[0] as $object) {
                if ($this->flagFromPayload($object)) {
                    $propose = true;
                    $clean = str_replace($object, '', $clean);
                }
            }
        }

        // HTML comment fallback
        if (preg_match_all('/<!--\s*krikkit:propose_workspace\s*=\s*(true|false|1|0|"true"|"false")\s*-->/iu', $clean, $comments, PREG_SET_ORDER)) {
            foreach ($comments as $comment) {
                $propose = $this->normalizeBool($comment[1]) || $propose;
                $clean = str_replace($comment[0], '', $clean);
            }
        }

        // Truncated / unclosed meta at end — drop, never leak.
        if (preg_match('/<<<KRIKKIT_META\b[\s\S]*$/siu', $clean, $openMatch)) {
            $propose = $this->flagFromPayload((string) preg_replace('/^<<<KRIKKIT_META/iu', '', $openMatch[0])) || $propose;
            $clean = preg_replace('/<<<KRIKKIT_META\b[\s\S]*$/siu', '', $clean) ?? $clean;
        }

        // Orphan meta closers (e.g. "…bloat.>>>") after a stripped / missing open tag.
        $clean = preg_replace('/(^|[\s.!?…,;:])>>>\s*(?=\s|$)/u', '$1', $clean) ?? $clean;
        $clean = preg_replace('/>>>\s*$/u', '', $clean) ?? $clean;

        // Collapse leftover blank lines from stripping
        $clean = preg_replace("/[ \t]+\n/", "\n", $clean) ?? $clean;
        $clean = preg_replace("/\n{3,}/", "\n\n", $clean) ?? $clean;

        return [
            'content' => trim($clean),
            'propose_workspace' => $propose,
        ];
    }

    private function looksLikeProposalPayload(string $raw): bool
    {
        return (bool) preg_match('/propose[_ ]?workspace/iu', $raw);
    }

    private function flagFromPayload(string $raw): bool
    {
        $trimmed = trim($raw);
        $decoded = json_decode($trimmed, true);

        if (is_array($decoded)) {
            foreach (['propose_workspace', 'proposeWorkspace', 'propose-workspace'] as $key) {
                if (array_key_exists($key, $decoded)) {
                    return $this->normalizeBool($decoded[$key]);
                }
            }
        }

        // Key/value without strict JSON
        if (preg_match('/propose[_ ]?workspace["\']?\s*[:=]\s*["\']?(true|false|1|0|yes|no)["\']?/iu', $trimmed, $match)) {
            return $this->normalizeBool($match[1]);
        }

        return false;
    }

    private function normalizeBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (int) $value === 1;
        }

        $raw = strtolower(trim((string) $value, " \t\n\r\0\x0B\"'"));

        return in_array($raw, ['true', '1', 'yes', 'on'], true);
    }
}
