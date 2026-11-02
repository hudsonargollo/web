<?php

namespace App\Lab\Github;

use App\Integrations\WorkspaceOauthAppStore;

/**
 * Workspace-tunable GitHub import limits (Integration → GitHub).
 */
final class LabGithubImportLimits
{
    public const MAX_ZIP_MB_MIN = 1;

    public const MAX_ZIP_MB_MAX = 512;

    public const MAX_ZIP_MB_DEFAULT = 25;

    public const MAX_FILES_MIN = 100;

    public const MAX_FILES_MAX = 20000;

    public const MAX_FILES_DEFAULT = 2500;

    public static function maxZipMb(): int
    {
        $stored = app(WorkspaceOauthAppStore::class)->setting(
            WorkspaceOauthAppStore::DRIVER_GITHUB,
            'max_zip_mb',
        );

        if (is_numeric($stored)) {
            return self::clampMb((int) $stored);
        }

        $bytes = (int) config('lab.github.max_zip_bytes', self::MAX_ZIP_MB_DEFAULT * 1024 * 1024);
        if ($bytes > 0) {
            return self::clampMb((int) max(1, (int) ceil($bytes / (1024 * 1024))));
        }

        return self::MAX_ZIP_MB_DEFAULT;
    }

    public static function maxZipBytes(): int
    {
        return self::maxZipMb() * 1024 * 1024;
    }

    public static function clampMb(int $mb): int
    {
        return max(self::MAX_ZIP_MB_MIN, min(self::MAX_ZIP_MB_MAX, $mb));
    }

    public static function maxFiles(): int
    {
        $stored = app(WorkspaceOauthAppStore::class)->setting(
            WorkspaceOauthAppStore::DRIVER_GITHUB,
            'max_files',
        );

        if (is_numeric($stored)) {
            return self::clampFiles((int) $stored);
        }

        $configured = (int) config('lab.github.max_files', self::MAX_FILES_DEFAULT);

        return $configured > 0 ? self::clampFiles($configured) : self::MAX_FILES_DEFAULT;
    }

    public static function clampFiles(int $files): int
    {
        return max(self::MAX_FILES_MIN, min(self::MAX_FILES_MAX, $files));
    }
}
