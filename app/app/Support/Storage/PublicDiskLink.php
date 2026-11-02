<?php

namespace App\Support\Storage;

use Illuminate\Support\Facades\File;

final class PublicDiskLink
{
    public static function ensure(?string $link = null, ?string $target = null): bool
    {
        $link ??= public_path('storage');
        $target ??= storage_path('app/public');

        File::ensureDirectoryExists($target);

        if (is_link($link)) {
            $current = (string) readlink($link);
            if ($current === $target || realpath($link) === realpath($target)) {
                return true;
            }

            File::delete($link);
        } elseif (is_dir($link)) {
            self::absorb($link, $target);
            File::deleteDirectory($link);
        } elseif (is_file($link)) {
            File::delete($link);
        }

        return @symlink($target, $link);
    }

    private static function absorb(string $from, string $into): void
    {
        foreach (File::allFiles($from) as $file) {
            $relative = ltrim(str_replace($from, '', $file->getPathname()), DIRECTORY_SEPARATOR);
            if ($relative === '' || $relative === '.gitignore') {
                continue;
            }

            $dest = $into.DIRECTORY_SEPARATOR.$relative;
            if (is_file($dest)) {
                continue;
            }

            File::ensureDirectoryExists(dirname($dest));
            File::copy($file->getPathname(), $dest);
        }
    }
}
