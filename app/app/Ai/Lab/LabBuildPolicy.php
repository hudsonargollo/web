<?php

namespace App\Ai\Lab;

use App\Ai\Support\ProviderToolSupport;

/**
 * First-turn tool policy that does not need a model.
 * Photographic briefs must lookup_visuals before write_file.
 */
final class LabBuildPolicy
{
    /**
     * @param  array<string, mixed>|null  $contextPack
     * @param  string|array<string, mixed>|null  $clientChoice
     * @param  list<object>|list<array<string, mixed>>  $messages
     * @return string|array<string, mixed>|null
     */
    public static function resolveExecutorToolChoice(
        ?array $contextPack,
        string|array|null $clientChoice,
        array $messages = [],
    ): string|array|null {
        if (ProviderToolSupport::isForcedToolChoice($clientChoice)) {
            return $clientChoice;
        }

        $safety = data_get($contextPack, 'pack.safetyFlags', []);
        $safety = is_array($safety) ? $safety : [];

        if ((bool) ($safety['forceWriteFile'] ?? false)) {
            return [
                'type' => 'function',
                'function' => ['name' => 'write_file'],
            ];
        }

        if ((bool) ($safety['forceLookupVisuals'] ?? false) || self::shouldLookupVisuals($contextPack, $messages)) {
            return [
                'type' => 'function',
                'function' => ['name' => 'lookup_visuals'],
            ];
        }

        return $clientChoice ?? 'required';
    }

    /**
     * @param  array<string, mixed>|null  $contextPack
     * @param  list<object>|list<array<string, mixed>>  $messages
     */
    public static function shouldLookupVisuals(?array $contextPack, array $messages = []): bool
    {
        $safety = data_get($contextPack, 'pack.safetyFlags', []);
        $safety = is_array($safety) ? $safety : [];
        if ((bool) ($safety['forceLookupVisuals'] ?? false)) {
            return true;
        }

        $text = self::briefText($contextPack, $messages);
        if (! BriefSignals::needsPhotograph($text)) {
            return false;
        }

        $hot = data_get($contextPack, 'pack.hotFiles', []);
        $files = [];
        if (is_array($hot)) {
            foreach ($hot as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $path = (string) ($row['path'] ?? '');
                if ($path === '') {
                    continue;
                }
                $files[$path] = (string) ($row['content'] ?? '');
            }
        }

        return ! BriefSignals::vfsHasPhotograph($files);
    }

    /**
     * User brief across the turn — last message alone misses silent-build / title-only opens.
     *
     * @param  array<string, mixed>|null  $contextPack
     * @param  list<object>|list<array<string, mixed>>  $messages
     */
    private static function briefText(?array $contextPack, array $messages = []): string
    {
        $parts = [];
        $title = (string) data_get($contextPack, 'pack.session.projectTitle', '');
        if ($title !== '') {
            $parts[] = $title;
        }
        $summary = (string) data_get($contextPack, 'pack.conversation.summary', '');
        if ($summary !== '') {
            $parts[] = $summary;
        }

        foreach ($messages as $row) {
            $role = is_object($row) ? ($row->role->value ?? $row->role ?? '') : ($row['role'] ?? '');
            $role = is_object($role) ? ($role->value ?? '') : (string) $role;
            if ($role !== 'user') {
                continue;
            }
            $content = is_object($row) ? (string) ($row->content ?? '') : (string) ($row['content'] ?? '');
            if ($content !== '') {
                $parts[] = $content;
            }
        }

        return implode("\n", $parts);
    }
}
