<?php

namespace App\Support\Locale;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Symfony\Component\Finder\SplFileInfo;

final class PhraseCatalog
{
    public const SOURCE = 'en';

    /**
     * @return list<string>
     */
    public function groups(): array
    {
        $dir = lang_path(self::SOURCE);

        if (! File::isDirectory($dir)) {
            return [];
        }

        $groups = collect(File::files($dir))
            ->filter(fn (SplFileInfo $file): bool => $file->getExtension() === 'php')
            ->map(fn (SplFileInfo $file): string => $file->getFilenameWithoutExtension())
            ->filter(fn (string $group): bool => $group !== '')
            ->sort()
            ->values()
            ->all();

        return $groups;
    }

    /**
     * @return array<string, string>
     */
    public function lines(string $group): array
    {
        $path = lang_path(self::SOURCE.'/'.$group.'.php');

        if (! File::isFile($path)) {
            return [];
        }

        $loaded = include $path;

        if (! is_array($loaded)) {
            return [];
        }

        return $this->flatten($loaded);
    }

    /**
     * @return list<array{key: string, source: string}>
     */
    public function entries(string $group): array
    {
        $entries = [];

        foreach ($this->lines($group) as $key => $source) {
            $entries[] = [
                'key' => $key,
                'source' => $source,
            ];
        }

        return $entries;
    }

    public function totalCount(?string $group = null): int
    {
        if ($group !== null) {
            return count($this->lines($group));
        }

        $total = 0;

        foreach ($this->groups() as $name) {
            $total += count($this->lines($name));
        }

        return $total;
    }

    /**
     * @param  array<string|int, mixed>  $lines
     * @return array<string, string>
     */
    private function flatten(array $lines, string $prefix = ''): array
    {
        $flat = [];

        foreach ($lines as $key => $value) {
            $path = $prefix === '' ? (string) $key : $prefix.'.'.$key;

            if (is_array($value)) {
                $flat = array_merge($flat, $this->flatten($value, $path));

                continue;
            }

            $flat[$path] = is_scalar($value) || $value === null
                ? (string) $value
                : Str::of(json_encode($value) ?: '')->toString();
        }

        return $flat;
    }
}
