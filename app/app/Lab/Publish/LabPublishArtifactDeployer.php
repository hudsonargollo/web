<?php

namespace App\Lab\Publish;

use Illuminate\Support\Facades\File;
use InvalidArgumentException;
use RuntimeException;
use Throwable;
use ZipArchive;

/**
 * Deploy a browser-built production artifact (zip of dist/) to the live host root.
 */
final class LabPublishArtifactDeployer
{
    /** @var list<string> */
    private const DIST_FOLDERS = ['dist', 'build', 'out'];

    public function deploy(string $zipPath, string $destination): void
    {
        if (! is_file($zipPath)) {
            throw new InvalidArgumentException(__('dashboard.Upload a production build archive.'));
        }

        $maxBytes = max(1, (int) config('lab.publish.artifact_max_bytes', 50 * 1024 * 1024));
        $size = filesize($zipPath);
        if ($size === false || $size > $maxBytes) {
            throw new InvalidArgumentException(__('dashboard.The build archive is too large.'));
        }

        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException(__('dashboard.ZIP support is required to publish Lab sites.'));
        }

        $extractRoot = sys_get_temp_dir().DIRECTORY_SEPARATOR.'krikkit-pub-'.bin2hex(random_bytes(8));
        File::ensureDirectoryExists($extractRoot);

        $zip = new ZipArchive;
        $opened = $zip->open($zipPath);

        if ($opened !== true) {
            File::deleteDirectory($extractRoot);

            throw new InvalidArgumentException(__('dashboard.Could not read the build archive.'));
        }

        try {
            $this->assertSafeZipEntries($zip, $extractRoot);
            if (! $zip->extractTo($extractRoot)) {
                throw new RuntimeException(__('dashboard.Could not extract the build archive.'));
            }
        } catch (Throwable $e) {
            $zip->close();
            File::deleteDirectory($extractRoot);

            throw $e instanceof RuntimeException || $e instanceof InvalidArgumentException
                ? $e
                : new RuntimeException(__('dashboard.Could not extract the build archive.'), previous: $e);
        }

        $zip->close();

        try {
            $siteRoot = $this->resolveSiteRoot($extractRoot);
            $this->assertPublishableSite($siteRoot);
            File::ensureDirectoryExists(dirname($destination));
            if (is_dir($destination)) {
                File::deleteDirectory($destination);
            }
            File::copyDirectory($siteRoot, $destination);
        } finally {
            File::deleteDirectory($extractRoot);
        }

        if (! is_file($destination.DIRECTORY_SEPARATOR.'index.html')) {
            if (is_dir($destination)) {
                File::deleteDirectory($destination);
            }

            throw new RuntimeException(__('dashboard.The build output is missing index.html.'));
        }
    }

    private function assertSafeZipEntries(ZipArchive $zip, string $extractRoot): void
    {
        $maxFiles = max(1, (int) config('lab.publish.artifact_max_files', 5000));
        $count = $zip->numFiles;

        if ($count > $maxFiles) {
            throw new InvalidArgumentException(__('dashboard.The build archive contains too many files.'));
        }

        $extractReal = realpath($extractRoot);
        if ($extractReal === false) {
            throw new RuntimeException(__('dashboard.Could not prepare a temporary folder for the build.'));
        }

        for ($i = 0; $i < $count; $i++) {
            $name = $zip->getNameIndex($i);
            if (! is_string($name) || $name === '') {
                continue;
            }

            $normalized = str_replace('\\', '/', $name);
            if (str_starts_with($normalized, '/') || str_contains($normalized, '../')) {
                throw new InvalidArgumentException(__('dashboard.The build archive contains unsafe paths.'));
            }

            if (str_ends_with($normalized, '/')) {
                continue;
            }

            $target = $extractReal.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $normalized);
            $parent = dirname($target);
            File::ensureDirectoryExists($parent);
            $parentReal = realpath($parent);
            if ($parentReal === false || ! str_starts_with($parentReal, $extractReal)) {
                throw new InvalidArgumentException(__('dashboard.The build archive contains unsafe paths.'));
            }
        }
    }

    private function resolveSiteRoot(string $extractRoot): string
    {
        foreach (self::DIST_FOLDERS as $folder) {
            $candidate = $extractRoot.DIRECTORY_SEPARATOR.$folder;
            if (is_dir($candidate) && is_file($candidate.DIRECTORY_SEPARATOR.'index.html')) {
                return $candidate;
            }
        }

        $entries = array_values(array_filter(
            scandir($extractRoot) ?: [],
            static fn (string $name): bool => $name !== '.' && $name !== '..',
        ));

        if (count($entries) === 1) {
            $only = $extractRoot.DIRECTORY_SEPARATOR.$entries[0];
            if (is_dir($only)) {
                foreach (self::DIST_FOLDERS as $folder) {
                    $nested = $only.DIRECTORY_SEPARATOR.$folder;
                    if (is_dir($nested) && is_file($nested.DIRECTORY_SEPARATOR.'index.html')) {
                        return $nested;
                    }
                }

                if (is_file($only.DIRECTORY_SEPARATOR.'index.html')) {
                    return $only;
                }
            }
        }

        if (is_file($extractRoot.DIRECTORY_SEPARATOR.'index.html')) {
            return $extractRoot;
        }

        throw new RuntimeException(__('dashboard.The build finished but no dist/ (or build/) folder was found.'));
    }

    private function assertPublishableSite(string $siteRoot): void
    {
        if (! is_file($siteRoot.DIRECTORY_SEPARATOR.'index.html')) {
            throw new RuntimeException(__('dashboard.The build output is missing index.html.'));
        }
    }
}
