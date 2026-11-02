<?php

namespace App\Support\Locale;

use App\Models\Language;
use App\Models\LanguageLine;
use Illuminate\Support\Facades\Schema;

final class PhraseLedger
{
    /**
     * @return array<string, string>
     */
    public function values(Language $language, string $group): array
    {
        if (! $this->ready()) {
            return [];
        }

        return LanguageLine::query()
            ->where('language_id', $language->id)
            ->where('group', $group)
            ->pluck('value', 'key')
            ->map(fn (mixed $value): string => (string) $value)
            ->all();
    }

    /**
     * @param  array<string, string>  $values
     */
    public function putMany(Language $language, string $group, array $values): void
    {
        if (! $this->ready()) {
            return;
        }

        foreach ($values as $key => $value) {
            $key = (string) $key;

            if ($key === '') {
                continue;
            }

            LanguageLine::query()->updateOrCreate(
                [
                    'language_id' => $language->id,
                    'group' => $group,
                    'key' => $key,
                ],
                ['value' => (string) $value],
            );
        }
    }

    /**
     * @return array<int, int>
     */
    public function filledCounts(): array
    {
        if (! $this->ready()) {
            return [];
        }

        return LanguageLine::query()
            ->selectRaw('language_id, count(*) as filled')
            ->whereNotNull('value')
            ->where('value', '!=', '')
            ->groupBy('language_id')
            ->pluck('filled', 'language_id')
            ->map(fn (mixed $count): int => (int) $count)
            ->all();
    }

    public function filledCount(Language $language, ?string $group = null): int
    {
        if (! $this->ready()) {
            return 0;
        }

        return LanguageLine::query()
            ->where('language_id', $language->id)
            ->when($group !== null, fn ($query) => $query->where('group', $group))
            ->whereNotNull('value')
            ->where('value', '!=', '')
            ->count();
    }

    private function ready(): bool
    {
        try {
            return Schema::hasTable('language_lines');
        } catch (\Throwable) {
            return false;
        }
    }
}
