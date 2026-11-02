<?php

namespace App\Lab;

use App\Ai\Data\ChatRole;
use App\Models\LabMessage;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

final class LabTurnHealth
{
    public const STUCK_AFTER_MINUTES = 10;

    /**
     * @return 'failed'|'stuck'|null
     */
    public static function inspect(LabMessage $message, ?CarbonInterface $now = null): ?string
    {
        if ($message->role !== ChatRole::Assistant->value) {
            return null;
        }

        if (self::isFailed($message)) {
            return 'failed';
        }

        if (self::isStuck($message, $now)) {
            return 'stuck';
        }

        return null;
    }

    /**
     * @return array{failed: list<LabMessage>, stuck: list<LabMessage>}
     */
    public static function scan(int $limit = 400): array
    {
        $messages = LabMessage::query()
            ->where('role', ChatRole::Assistant->value)
            ->with(['project.user'])
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get();

        $failed = [];
        $stuck = [];

        foreach ($messages as $message) {
            $kind = self::inspect($message);

            if ($kind === 'failed') {
                $failed[] = $message;
            } elseif ($kind === 'stuck') {
                $stuck[] = $message;
            }
        }

        return [
            'failed' => $failed,
            'stuck' => $stuck,
        ];
    }

    public static function isFailed(LabMessage $message): bool
    {
        $meta = is_array($message->metadata) ? $message->metadata : [];

        $status = strtolower((string) ($meta['turnStatus'] ?? ''));
        if ($status !== '' && (str_contains($status, 'fail') || str_contains($status, 'error'))) {
            return true;
        }

        $thinking = is_array($meta['thinking'] ?? null) ? $meta['thinking'] : [];
        if (strtolower((string) ($thinking['status'] ?? '')) === 'error') {
            return true;
        }

        $failure = is_array($meta['validationFailure'] ?? null) ? $meta['validationFailure'] : [];
        if (filled($failure['errorClass'] ?? null) || (is_array($failure['errors'] ?? null) && $failure['errors'] !== [])) {
            return true;
        }

        foreach (is_array($meta['callouts'] ?? null) ? $meta['callouts'] : [] as $callout) {
            if (! is_array($callout)) {
                continue;
            }

            $tone = strtolower((string) ($callout['tone'] ?? ''));
            if (in_array($tone, ['danger', 'fail', 'error'], true)) {
                return true;
            }
        }

        return self::toolStatuses($meta)->contains(fn (string $status): bool => in_array($status, ['error', 'failed', 'fail'], true));
    }

    public static function isStuck(LabMessage $message, ?CarbonInterface $now = null): bool
    {
        if (self::isFailed($message)) {
            return false;
        }

        $cutoff = ($now ?? Carbon::now())->copy()->subMinutes(self::STUCK_AFTER_MINUTES);
        $touched = $message->updated_at ?? $message->created_at;

        if ($touched === null || $touched->greaterThan($cutoff)) {
            return false;
        }

        $meta = is_array($message->metadata) ? $message->metadata : [];

        if (self::hasOpenWork($meta)) {
            return true;
        }

        $turnStatus = (string) ($meta['turnStatus'] ?? '');
        $waitLabel = self::isWaitLabel($turnStatus);
        $settled = self::hasSettledChrome($meta);
        $empty = trim((string) $message->content) === '';

        // Leftover "Writing files…" / "Finishing…" on an otherwise finished turn.
        if ($waitLabel && $settled) {
            return false;
        }

        if ($waitLabel && $empty) {
            return true;
        }

        return $empty && $meta !== [] && ! $settled;
    }

    /**
     * Badge copy for Failed / Stuck lists — never prefer a leftover wait label
     * over the actual failure.
     */
    public static function statusLabel(LabMessage $message, string $kind): string
    {
        $meta = is_array($message->metadata) ? $message->metadata : [];

        if ($kind === 'failed') {
            $errorClass = trim((string) data_get($meta, 'validationFailure.errorClass', ''));
            if ($errorClass !== '') {
                return $errorClass;
            }

            foreach (is_array($meta['callouts'] ?? null) ? $meta['callouts'] : [] as $callout) {
                if (! is_array($callout)) {
                    continue;
                }
                $tone = strtolower((string) ($callout['tone'] ?? ''));
                $text = trim((string) ($callout['text'] ?? ''));
                if (in_array($tone, ['danger', 'fail', 'error'], true) && $text !== '') {
                    if (function_exists('mb_substr')) {
                        return mb_substr($text, 0, 48);
                    }

                    return substr($text, 0, 48);
                }
            }

            $turnStatus = trim((string) ($meta['turnStatus'] ?? ''));
            $lower = strtolower($turnStatus);
            if ($turnStatus !== '' && (str_contains($lower, 'fail') || str_contains($lower, 'error'))) {
                return $turnStatus;
            }

            return __('dashboard.Failed');
        }

        $turnStatus = trim((string) ($meta['turnStatus'] ?? ''));
        if ($turnStatus !== '') {
            return $turnStatus;
        }

        return __('dashboard.Stuck');
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private static function hasOpenWork(array $meta): bool
    {
        $thinking = is_array($meta['thinking'] ?? null) ? $meta['thinking'] : [];
        $thinkingStatus = strtolower((string) ($thinking['status'] ?? ''));
        if (self::isOpenStatus($thinkingStatus)) {
            return true;
        }

        return self::toolStatuses($meta)->contains(fn (string $status): bool => self::isOpenStatus($status));
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private static function hasSettledChrome(array $meta): bool
    {
        $thinking = is_array($meta['thinking'] ?? null) ? $meta['thinking'] : [];
        if (strtolower((string) ($thinking['status'] ?? '')) === 'done') {
            return true;
        }

        return self::toolStatuses($meta)->contains(
            fn (string $status): bool => in_array($status, ['done', 'ok', 'complete', 'skipped', 'error', 'failed', 'fail'], true),
        );
    }

    private static function isOpenStatus(string $status): bool
    {
        return in_array(strtolower($status), ['pending', 'active', 'running', 'streaming', 'thinking'], true);
    }

    private static function isWaitLabel(string $turnStatus): bool
    {
        return $turnStatus !== '' && (str_ends_with($turnStatus, '…') || str_ends_with($turnStatus, '...'));
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return Collection<int, string>
     */
    private static function toolStatuses(array $meta): Collection
    {
        $cards = [];

        foreach (['listDir', 'fileSearch', 'grep', 'readFile', 'editFile', 'shell', 'fetch', 'writeFile', 'vfsHeal', 'datastoreSurvey', 'datastoreRevision'] as $key) {
            if (is_array($meta[$key] ?? null)) {
                $cards[] = $meta[$key];
            }
        }

        foreach (['listDirs', 'fileSearches', 'greps', 'reads', 'edits', 'writes', 'toolStack', 'toolActivity.entries'] as $key) {
            $rows = data_get($meta, $key);
            if (! is_array($rows)) {
                continue;
            }

            foreach ($rows as $row) {
                if (is_array($row)) {
                    $cards[] = $row;
                }
            }
        }

        $activity = is_array($meta['toolActivity'] ?? null) ? $meta['toolActivity'] : [];
        if (isset($activity['status'])) {
            $cards[] = $activity;
        }

        return collect($cards)
            ->map(fn (array $card): string => strtolower((string) ($card['status'] ?? '')))
            ->filter()
            ->values();
    }
}
