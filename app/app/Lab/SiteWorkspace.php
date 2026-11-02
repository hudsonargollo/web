<?php

namespace App\Lab;

use App\Lab\Github\LabGithubImportLimits;
use App\Models\LabProject;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Finder\Finder;
use Throwable;

/**
 * Materializes and sandboxes per-project React+Vite+Tailwind workspaces on disk.
 */
final class SiteWorkspace
{
    public const KIT_VERSION = 3;

    public const STACK = 'react-vite-tailwind';

    /** @var list<string> */
    private const HIDDEN_DIR_NAMES = [
        'node_modules',
        'dist',
        'build',
        'out',
        'coverage',
        'vendor',
        '.git',
        '.vite',
        '.next',
        '.nuxt',
        '.turbo',
        '.vercel',
        '.cache',
        '.krikkit-tx',
        '.krikkit',
    ];

    public const COVER_DIR = '.krikkit';

    /** @var list<string> */
    private const COVER_NAMES = [
        'cover.webp',
        'cover.jpg',
        'cover.jpeg',
        'cover.png',
    ];

    /** Lockfiles / install manifests — skip on import (inflate file counts, useless in Lab). */
    private const SKIP_IMPORT_BASENAMES = [
        'pnpm-lock.yaml',
        'package-lock.json',
        'yarn.lock',
        'bun.lock',
        'bun.lockb',
        'npm-shrinkwrap.json',
        'composer.lock',
        'Cargo.lock',
    ];

    public function kitPath(): string
    {
        return resource_path('lab/site-kit');
    }

    public function root(LabProject $project): string
    {
        return storage_path('app/lab/projects/'.$project->uuid);
    }

    public function forget(LabProject $project): void
    {
        $root = $this->root($project);

        if (is_dir($root)) {
            File::deleteDirectory($root);
        }
    }

    /**
     * Ensure the project workspace exists on disk (copy kit if missing).
     */
    public function ensure(LabProject $project): string
    {
        $root = $this->root($project);

        if (is_dir($root) && is_file($root.'/.krikkit-kit')) {
            if ($project->workspace_status !== 'ready') {
                $project->forceFill([
                    'workspace_status' => 'ready',
                    'kit_version' => self::KIT_VERSION,
                    'stack' => self::STACK,
                ])->save();
            }

            return $root;
        }

        $project->forceFill(['workspace_status' => 'pending'])->save();

        try {
            $kit = $this->kitPath();

            if (! is_dir($kit)) {
                throw new RuntimeException('Site kit is missing at resources/lab/site-kit.');
            }

            File::ensureDirectoryExists(dirname($root));

            if (is_dir($root)) {
                File::deleteDirectory($root);
            }

            File::copyDirectory($kit, $root);

            File::put($root.'/.krikkit-kit', json_encode([
                'version' => self::KIT_VERSION,
                'stack' => self::STACK,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");

            $project->forceFill([
                'kit_version' => self::KIT_VERSION,
                'stack' => self::STACK,
                'workspace_status' => 'ready',
            ])->save();
        } catch (Throwable $e) {
            $project->forceFill(['workspace_status' => 'error'])->save();

            throw $e;
        }

        return $root;
    }

    /**
     * Wipe the workspace and leave only the Lab marker — used before GitHub import
     * so the seed kit (`Your site starts here`) does not shadow imported apps.
     */
    public function resetForImport(LabProject $project): string
    {
        $root = $this->root($project);

        File::ensureDirectoryExists(dirname($root));

        if (is_dir($root)) {
            File::deleteDirectory($root);
        }

        File::ensureDirectoryExists($root);
        File::put($root.'/.krikkit-kit', json_encode([
            'version' => self::KIT_VERSION,
            'stack' => self::STACK,
            'origin' => 'github-import',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");

        $project->forceFill([
            'kit_version' => self::KIT_VERSION,
            'stack' => self::STACK,
            'workspace_status' => 'ready',
        ])->save();

        return $root;
    }

    /**
     * True when disk still matches the seed kit (no user/AI edits yet).
     */
    public function isPristine(LabProject $project): bool
    {
        $root = $this->ensure($project);
        $kit = $this->kitPath();

        /** @var list<string> */
        $tracked = [
            'index.html',
            'package.json',
            'vite.config.js',
            'src/App.jsx',
            'src/main.jsx',
            'src/index.css',
            'src/lib/utils.js',
            'src/components/ui/button.jsx',
            'src/components/ui/badge.jsx',
            'src/components/ui/card.jsx',
            'src/components/ui/input.jsx',
            'src/components/ui/label.jsx',
            'src/components/ui/textarea.jsx',
            'src/components/ui/reveal.jsx',
            'public/favicon.svg',
        ];

        foreach ($tracked as $relative) {
            $diskFile = $root.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
            $kitFile = $kit.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);

            if (! is_file($diskFile) || ! is_file($kitFile)) {
                return false;
            }

            if (md5_file($diskFile) !== md5_file($kitFile)) {
                return false;
            }
        }

        $components = $root.DIRECTORY_SEPARATOR.'src'.DIRECTORY_SEPARATOR.'components';

        if (is_dir($components)) {
            $finder = Finder::create()
                ->in($components)
                ->files()
                ->ignoreDotFiles(false);

            foreach ($finder as $file) {
                if ($file->getFilename() === '.gitkeep') {
                    continue;
                }

                $relative = 'src/components/'.str_replace('\\', '/', $file->getRelativePathname());
                $kitFile = $kit.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);

                // Seed UI primitives shipped with the kit are still pristine.
                if (is_file($kitFile) && md5_file($file->getPathname()) === md5_file($kitFile)) {
                    continue;
                }

                return false;
            }
        }

        return true;
    }

    /**
     * Nested tree for the Files UI.
     *
     * @return list<array<string, mixed>>
     */
    public function tree(LabProject $project): array
    {
        $root = $this->ensure($project);

        return $this->scanDirectory($root, '');
    }

    public function read(LabProject $project, string $relative): string
    {
        $absolute = $this->resolveExisting($project, $relative, mustBeFile: true);

        if (! $this->isReadableRelative($relative)) {
            throw new InvalidArgumentException('Path is not readable.');
        }

        $contents = File::get($absolute);

        if (! mb_check_encoding($contents, 'UTF-8')) {
            throw new InvalidArgumentException('Binary files cannot be opened in the editor.');
        }

        return $contents;
    }

    public function write(LabProject $project, string $relative, string $body): void
    {
        $relative = $this->normalizeRelative($relative);

        if (! $this->isWritableRelative($relative)) {
            throw new InvalidArgumentException('Path is not writable.');
        }

        $root = $this->ensure($project);
        $absolute = $this->joinUnderRoot($root, $relative);

        File::ensureDirectoryExists(dirname($absolute));
        File::put($absolute, $body);
    }

    /**
     * All-or-nothing multi-file disk commit via staging + backup restore.
     *
     * @param  array<string, string>  $files  relative path → content
     * @return list<string> committed paths
     */
    public function commitAtomic(LabProject $project, array $files): array
    {
        if ($files === []) {
            return [];
        }

        $root = $this->ensure($project);
        $normalized = [];

        foreach ($files as $relative => $body) {
            $path = $this->normalizeRelative((string) $relative);
            if ($path === '' || ! $this->isWritableRelative($path)) {
                throw new InvalidArgumentException("Path is not writable: {$relative}");
            }
            $normalized[$path] = (string) $body;
        }

        $txn = bin2hex(random_bytes(8));
        $stagingRoot = $root.DIRECTORY_SEPARATOR.'.krikkit-tx'.DIRECTORY_SEPARATOR.$txn;
        $backupRoot = $root.DIRECTORY_SEPARATOR.'.krikkit-tx'.DIRECTORY_SEPARATOR.$txn.'.bak';

        File::ensureDirectoryExists($stagingRoot);
        File::ensureDirectoryExists($backupRoot);

        $backedUp = [];
        $applied = [];

        try {
            foreach ($normalized as $path => $body) {
                $stageFile = $this->joinLogical($stagingRoot, $path);
                File::ensureDirectoryExists(dirname($stageFile));
                File::put($stageFile, $body);
            }

            foreach ($normalized as $path => $body) {
                $live = $this->joinUnderRoot($root, $path);
                if (is_file($live)) {
                    $backupFile = $this->joinLogical($backupRoot, $path);
                    File::ensureDirectoryExists(dirname($backupFile));
                    File::copy($live, $backupFile);
                    $backedUp[] = $path;
                }

                File::ensureDirectoryExists(dirname($live));
                $stageFile = $this->joinLogical($stagingRoot, $path);
                File::put($live, File::get($stageFile));
                File::delete($stageFile);
                $applied[] = $path;
            }

            File::deleteDirectory($stagingRoot);
            File::deleteDirectory($backupRoot);

            return array_keys($normalized);
        } catch (Throwable $e) {
            foreach (array_reverse($applied) as $path) {
                $live = $this->joinUnderRoot($root, $path);
                $backupFile = $this->joinLogical($backupRoot, $path);
                if (is_file($backupFile)) {
                    File::ensureDirectoryExists(dirname($live));
                    File::copy($backupFile, $live);
                } elseif (in_array($path, $applied, true) && ! in_array($path, $backedUp, true)) {
                    // New file created during failed txn — remove it.
                    if (is_file($live)) {
                        File::delete($live);
                    }
                }
            }

            if (is_dir($stagingRoot)) {
                File::deleteDirectory($stagingRoot);
            }
            if (is_dir($backupRoot)) {
                File::deleteDirectory($backupRoot);
            }

            throw $e;
        }
    }

    private function joinLogical(string $root, string $relative): string
    {
        return $root.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
    }

    public function mkdir(LabProject $project, string $relative): void
    {
        $relative = $this->normalizeRelative($relative);

        if (! $this->isWritableRelative($relative)) {
            throw new InvalidArgumentException('Path is not writable.');
        }

        $root = $this->ensure($project);
        $absolute = $this->joinUnderRoot($root, $relative);

        File::ensureDirectoryExists($absolute);
    }

    public function delete(LabProject $project, string $relative): void
    {
        $relative = $this->normalizeRelative($relative);

        if ($relative === '' || $relative === '.') {
            throw new InvalidArgumentException('Cannot delete the workspace root.');
        }

        if (! $this->isWritableRelative($relative)) {
            throw new InvalidArgumentException('Path is not writable.');
        }

        $absolute = $this->resolveExisting($project, $relative, mustBeFile: false);

        if (is_dir($absolute)) {
            File::deleteDirectory($absolute);
        } else {
            File::delete($absolute);
        }
    }

    public function isWritableRelative(string $relative): bool
    {
        $relative = $this->normalizeRelative($relative);

        // Root project config + entry (Lab site-kit). package.json already allowed for deps.
        $rootWritable = [
            'index.html',
            'package.json',
            'vite.config.js',
            'vite.config.ts',
            'vite.config.mjs',
            'postcss.config.js',
            'postcss.config.cjs',
            'postcss.config.mjs',
            'tailwind.config.js',
            'tailwind.config.ts',
            'tailwind.config.cjs',
            'tailwind.config.mjs',
        ];

        if (in_array($relative, $rootWritable, true)) {
            return true;
        }

        return str_starts_with($relative, 'src/')
            || str_starts_with($relative, 'public/')
            || $relative === 'src'
            || $relative === 'public';
    }

    /**
     * Copy an extracted tree into the project (GitHub zipball import).
     * Broader than editor writes: any non-hidden path under the workspace root.
     *
     * @return array{paths: list<string>, skipped: int}
     */
    public function importTree(LabProject $project, string $sourceDir): array
    {
        $started = microtime(true);
        $sourceReal = realpath($sourceDir);

        if ($sourceReal === false || ! is_dir($sourceReal)) {
            throw new InvalidArgumentException('Import source directory is missing.');
        }

        $root = $this->ensure($project);
        $maxFiles = LabGithubImportLimits::maxFiles();
        $maxFileBytes = (int) config('lab.github.max_file_bytes', 2 * 1024 * 1024);

        $finder = Finder::create()
            ->in($sourceReal)
            ->files()
            ->ignoreDotFiles(false)
            ->ignoreVCS(true)
            ->exclude(self::HIDDEN_DIR_NAMES);

        $paths = [];
        $skipped = 0;
        $seen = 0;
        $oversized = 0;

        foreach ($finder as $file) {
            $seen++;
            $relative = str_replace('\\', '/', $file->getRelativePathname());
            $relative = ltrim($relative, '/');

            if ($relative === '' || ! $this->isImportableRelative($relative)) {
                $skipped++;

                continue;
            }

            if ($file->getSize() > $maxFileBytes) {
                $oversized++;
                $skipped++;

                continue;
            }

            if (count($paths) >= $maxFiles) {
                $elapsedMs = (int) round((microtime(true) - $started) * 1000);
                Log::warning('lab.github.import.too_many_files', [
                    'project_uuid' => $project->uuid,
                    'source' => $sourceReal,
                    'max_files' => $maxFiles,
                    'imported_before_limit' => count($paths),
                    'files_seen' => $seen,
                    'skipped' => $skipped,
                    'oversized' => $oversized,
                    'elapsed_ms' => $elapsedMs,
                    'sample_imported' => array_slice($paths, 0, 12),
                    'blocked_on' => $relative,
                ]);

                throw new InvalidArgumentException(__('dashboard.Repository has too many files to import. Raise the max file count under API Integration → GitHub, or set Root directory (e.g. apps/www).'));
            }

            $absolute = $this->joinUnderRoot($root, $relative);
            File::ensureDirectoryExists(dirname($absolute));
            File::copy($file->getPathname(), $absolute);
            $paths[] = $relative;
        }

        if ($paths === []) {
            Log::warning('lab.github.import.no_files', [
                'project_uuid' => $project->uuid,
                'source' => $sourceReal,
                'files_seen' => $seen,
                'skipped' => $skipped,
                'oversized' => $oversized,
                'elapsed_ms' => (int) round((microtime(true) - $started) * 1000),
            ]);

            throw new InvalidArgumentException(__('dashboard.No importable files were found in the repository.'));
        }

        Log::info('lab.github.import.ok', [
            'project_uuid' => $project->uuid,
            'source' => $sourceReal,
            'imported' => count($paths),
            'files_seen' => $seen,
            'skipped' => $skipped,
            'oversized' => $oversized,
            'max_files' => $maxFiles,
            'elapsed_ms' => (int) round((microtime(true) - $started) * 1000),
        ]);

        return [
            'paths' => $paths,
            'skipped' => $skipped,
        ];
    }

    /**
     * Write an in-memory path → body map (GitHub subtree import).
     *
     * @param  array<string, string>  $files
     * @return array{paths: list<string>, skipped: int}
     */
    public function importFileMap(LabProject $project, array $files): array
    {
        $started = microtime(true);
        $root = $this->ensure($project);
        $maxFiles = LabGithubImportLimits::maxFiles();
        $maxFileBytes = (int) config('lab.github.max_file_bytes', 2 * 1024 * 1024);

        $paths = [];
        $skipped = 0;

        foreach ($files as $relative => $body) {
            $relative = str_replace('\\', '/', (string) $relative);
            $relative = ltrim($relative, '/');

            if ($relative === '' || ! $this->isImportableRelative($relative)) {
                $skipped++;

                continue;
            }

            if (strlen($body) > $maxFileBytes) {
                $skipped++;

                continue;
            }

            if (count($paths) >= $maxFiles) {
                Log::warning('lab.github.import.too_many_files', [
                    'project_uuid' => $project->uuid,
                    'source' => 'file-map',
                    'max_files' => $maxFiles,
                    'imported_before_limit' => count($paths),
                    'map_size' => count($files),
                    'skipped' => $skipped,
                    'elapsed_ms' => (int) round((microtime(true) - $started) * 1000),
                    'blocked_on' => $relative,
                ]);

                throw new InvalidArgumentException(__('dashboard.Repository has too many files to import. Raise the max file count under API Integration → GitHub, or set Root directory (e.g. apps/www).'));
            }

            $absolute = $this->joinUnderRoot($root, $relative);
            File::ensureDirectoryExists(dirname($absolute));
            File::put($absolute, $body);
            $paths[] = $relative;
        }

        if ($paths === []) {
            Log::warning('lab.github.import.no_files', [
                'project_uuid' => $project->uuid,
                'source' => 'file-map',
                'map_size' => count($files),
                'skipped' => $skipped,
                'elapsed_ms' => (int) round((microtime(true) - $started) * 1000),
            ]);

            throw new InvalidArgumentException(__('dashboard.No importable files were found in the repository.'));
        }

        Log::info('lab.github.import.ok', [
            'project_uuid' => $project->uuid,
            'source' => 'file-map',
            'imported' => count($paths),
            'skipped' => $skipped,
            'max_files' => $maxFiles,
            'elapsed_ms' => (int) round((microtime(true) - $started) * 1000),
        ]);

        return [
            'paths' => $paths,
            'skipped' => $skipped,
        ];
    }

    /**
     * Fumadocs MDX generates `@/.source` at build time — seed a preview-safe stub when missing.
     */
    public function ensureFumadocsSourceStub(LabProject $project): void
    {
        $root = $this->ensure($project);
        $marker = $root.DIRECTORY_SEPARATOR.'.source'.DIRECTORY_SEPARATOR.'index.ts';
        if (is_file($marker) || is_file($root.DIRECTORY_SEPARATOR.'.source.ts')) {
            return;
        }

        $needs = false;
        foreach (['source.config.ts', 'source.config.mjs', 'lib/source.ts', 'lib/source.tsx'] as $probe) {
            $absolute = $root.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $probe);
            if (! is_file($absolute)) {
                continue;
            }
            $body = (string) File::get($absolute);
            if (str_contains($body, '@/.source') || str_contains($body, 'fumadocs-mdx')) {
                $needs = true;
                break;
            }
        }

        if (! $needs) {
            return;
        }

        File::ensureDirectoryExists(dirname($marker));
        File::put($marker, <<<'TS'
/** @krikkit-preview-stub — fumadocs `.source` is generated at Next build time. */
const empty = {
  toFumadocsSource() {
    return { files: [] as { type: string; path: string; data: Record<string, unknown> }[] }
  },
}

export const docs = empty
export const blog = empty
export const showcase = empty
export default { docs, blog, showcase }

TS);
    }

    /**
     * @param  list<string>  $paths
     * @return array<string, string>
     */
    public function readMany(LabProject $project, array $paths): array
    {
        $out = [];
        foreach ($paths as $path) {
            $relative = $this->normalizeRelative((string) $path);
            if ($relative === '') {
                continue;
            }

            try {
                $out[$relative] = $this->read($project, $relative);
            } catch (InvalidArgumentException) {
                continue;
            } catch (Throwable) {
                continue;
            }
        }

        return $out;
    }

    /**
     * Text files Lab can push to GitHub (hidden dirs and binaries stay out).
     *
     * @return array<string, string> relative path → contents
     */
    public function collectPushFiles(LabProject $project): array
    {
        $root = $this->ensure($project);
        $maxFileBytes = (int) config('lab.github.max_file_bytes', 2 * 1024 * 1024);
        $maxFiles = LabGithubImportLimits::maxFiles();

        $finder = Finder::create()
            ->in($root)
            ->files()
            ->ignoreDotFiles(false)
            ->ignoreVCS(true)
            ->exclude(self::HIDDEN_DIR_NAMES);

        $out = [];
        foreach ($finder as $file) {
            $relative = str_replace('\\', '/', $file->getRelativePathname());
            $relative = ltrim($relative, '/');
            if ($relative === '' || ! $this->isImportableRelative($relative)) {
                continue;
            }
            if ($file->getSize() > $maxFileBytes) {
                continue;
            }

            $contents = File::get($file->getPathname());
            if (! mb_check_encoding($contents, 'UTF-8')) {
                continue;
            }

            $out[$relative] = $contents;
            if (count($out) >= $maxFiles) {
                break;
            }
        }

        ksort($out);

        return $out;
    }

    /**
     * Paths allowed during GitHub (or similar) archive import.
     */
    public function isImportableRelative(string $relative): bool
    {
        $relative = $this->normalizeRelative($relative);

        if ($relative === '' || $relative === '.krikkit-kit') {
            return false;
        }

        $base = basename($relative);
        if (in_array($base, self::SKIP_IMPORT_BASENAMES, true)) {
            return false;
        }

        foreach (self::HIDDEN_DIR_NAMES as $hidden) {
            if ($relative === $hidden || str_starts_with($relative, $hidden.'/')) {
                return false;
            }
        }

        // Dotfiles stay out except Vite env + generated fumadocs `.source`.
        $envFiles = [
            '.env',
            '.env.local',
            '.env.development',
            '.env.development.local',
            '.env.example',
        ];
        $allowedDotNames = [...$envFiles, '.source'];

        foreach (explode('/', $relative) as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if (str_starts_with($part, '.')) {
                if (in_array($part, $allowedDotNames, true)) {
                    continue;
                }

                return false;
            }
        }

        return true;
    }

    public function isReadableRelative(string $relative): bool
    {
        $relative = $this->normalizeRelative($relative);

        if ($relative === '') {
            return true;
        }

        foreach (self::HIDDEN_DIR_NAMES as $hidden) {
            if ($relative === $hidden || str_starts_with($relative, $hidden.'/')) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function scanDirectory(string $absoluteDir, string $relativeDir): array
    {
        $nodes = [];

        $finder = Finder::create()
            ->in($absoluteDir)
            ->depth('== 0')
            ->ignoreDotFiles(false)
            ->sortByName();

        foreach ($finder as $item) {
            $name = $item->getFilename();

            if ($name === '.krikkit-kit') {
                continue;
            }

            if ($item->isDir() && in_array($name, self::HIDDEN_DIR_NAMES, true)) {
                continue;
            }

            $relative = $relativeDir === '' ? $name : $relativeDir.'/'.$name;

            if ($item->isDir()) {
                $children = $this->scanDirectory($item->getPathname(), $relative);
                $nodes[] = [
                    'id' => 'dir-'.md5($relative),
                    'type' => 'folder',
                    'name' => $name,
                    'path' => $relative,
                    'modifiedLabel' => $this->relativeTime($item->getMTime()),
                    'children' => $children,
                ];

                continue;
            }

            $nodes[] = [
                'id' => 'file-'.md5($relative),
                'type' => 'file',
                'name' => $name,
                'path' => $relative,
                'kind' => $this->kindForName($name),
                'sizeLabel' => $this->formatSize($item->getSize()),
                'modifiedLabel' => $this->relativeTime($item->getMTime()),
                'yours' => false,
            ];
        }

        usort($nodes, function (array $a, array $b): int {
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'folder' ? -1 : 1;
            }

            return strcasecmp($a['name'], $b['name']);
        });

        return $nodes;
    }

    private function resolveExisting(LabProject $project, string $relative, bool $mustBeFile): string
    {
        $relative = $this->normalizeRelative($relative);
        $root = $this->ensure($project);
        $absolute = $this->joinUnderRoot($root, $relative);

        if (! file_exists($absolute)) {
            throw new InvalidArgumentException('Path does not exist.');
        }

        if ($mustBeFile && ! is_file($absolute)) {
            throw new InvalidArgumentException('Path is not a file.');
        }

        return $absolute;
    }

    private function joinUnderRoot(string $root, string $relative): string
    {
        $rootReal = realpath($root);

        if ($rootReal === false) {
            throw new RuntimeException('Workspace root is missing.');
        }

        $candidate = $relative === '' ? $rootReal : $rootReal.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);

        if ($relative === '') {
            return $rootReal;
        }

        $parent = dirname($candidate);

        if (! is_dir($parent)) {
            // For writes, parent may not exist yet — validate logical containment.
            $normalizedRoot = $this->normalizeAbsolute($rootReal);
            $normalizedCandidate = $this->normalizeAbsolute($candidate);

            if (! str_starts_with($normalizedCandidate, $normalizedRoot.DIRECTORY_SEPARATOR)
                && $normalizedCandidate !== $normalizedRoot) {
                throw new InvalidArgumentException('Path escapes the workspace.');
            }

            return $candidate;
        }

        // When the file exists, realpath both sides.
        if (file_exists($candidate)) {
            $real = realpath($candidate);

            if ($real === false
                || (! str_starts_with($real, $rootReal.DIRECTORY_SEPARATOR) && $real !== $rootReal)) {
                throw new InvalidArgumentException('Path escapes the workspace.');
            }

            return $real;
        }

        $parentReal = realpath($parent);

        if ($parentReal === false
            || (! str_starts_with($parentReal, $rootReal.DIRECTORY_SEPARATOR) && $parentReal !== $rootReal)) {
            throw new InvalidArgumentException('Path escapes the workspace.');
        }

        return $parentReal.DIRECTORY_SEPARATOR.basename($candidate);
    }

    private function normalizeAbsolute(string $path): string
    {
        $path = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
        $parts = [];

        foreach (explode(DIRECTORY_SEPARATOR, $path) as $part) {
            if ($part === '' || $part === '.') {
                if ($parts === [] && $path !== '' && ($path[0] === '/' || $path[0] === '\\')) {
                    $parts[] = '';
                }

                continue;
            }

            if ($part === '..') {
                array_pop($parts);

                continue;
            }

            $parts[] = $part;
        }

        $joined = implode(DIRECTORY_SEPARATOR, $parts);

        return $joined === '' ? DIRECTORY_SEPARATOR : $joined;
    }

    private function normalizeRelative(string $relative): string
    {
        $relative = str_replace('\\', '/', trim($relative));
        $relative = ltrim($relative, '/');

        if ($relative === '' || $relative === '.') {
            return '';
        }

        $parts = [];

        foreach (explode('/', $relative) as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }

            if ($part === '..') {
                throw new InvalidArgumentException('Path escapes the workspace.');
            }

            $parts[] = $part;
        }

        return implode('/', $parts);
    }

    private function kindForName(string $name): string
    {
        $lower = strtolower($name);

        if (str_ends_with($lower, '.md') || str_ends_with($lower, '.mdx')) {
            return 'markdown';
        }

        if (preg_match('/\.(png|jpe?g|gif|webp|svg)$/', $lower) === 1) {
            return 'image';
        }

        return 'code';
    }

    private function formatSize(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return rtrim(rtrim(number_format($bytes / 1024, 1, '.', ''), '0'), '.').' KB';
        }

        return rtrim(rtrim(number_format($bytes / (1024 * 1024), 1, '.', ''), '0'), '.').' MB';
    }

    private function relativeTime(int $timestamp): string
    {
        $delta = max(0, time() - $timestamp);

        if ($delta < 60) {
            return 'Just now';
        }

        if ($delta < 3600) {
            $m = (int) floor($delta / 60);

            return $m === 1 ? '1 min ago' : "{$m} mins ago";
        }

        if ($delta < 86400) {
            return 'Today';
        }

        if ($delta < 172800) {
            return 'Yesterday';
        }

        if ($delta < 86400 * 7) {
            $d = (int) floor($delta / 86400);

            return "{$d} days ago";
        }

        return 'Last week';
    }

    /**
     * Copy a workspace onto another project, skipping install/build caches.
     */
    public function cloneDisk(LabProject $source, LabProject $target): void
    {
        $from = $this->root($source);
        $to = $this->root($target);

        if (is_dir($to)) {
            File::deleteDirectory($to);
        }

        if (! is_dir($from)) {
            $this->ensure($target);

            return;
        }

        File::ensureDirectoryExists($to);

        $finder = Finder::create()
            ->in($from)
            ->ignoreDotFiles(false)
            ->exclude(self::HIDDEN_DIR_NAMES);

        foreach ($finder as $item) {
            $relative = str_replace('\\', '/', $item->getRelativePathname());
            $dest = $this->joinUnderRoot($to, $relative);

            if ($item->isDir()) {
                File::ensureDirectoryExists($dest);

                continue;
            }

            File::ensureDirectoryExists(dirname($dest));
            File::copy($item->getPathname(), $dest);
        }

        $this->copyCover($source, $target);
    }

    /**
     * Studio card thumbnail captured from the live Lab preview iframe.
     */
    public function coverPath(LabProject $project): ?string
    {
        $dir = $this->root($project).DIRECTORY_SEPARATOR.self::COVER_DIR;

        foreach (self::COVER_NAMES as $name) {
            $path = $dir.DIRECTORY_SEPARATOR.$name;
            if (is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    public function coverMime(LabProject $project): ?string
    {
        $path = $this->coverPath($project);
        if ($path === null) {
            return null;
        }

        return match (strtolower((string) pathinfo($path, PATHINFO_EXTENSION))) {
            'webp' => 'image/webp',
            'png' => 'image/png',
            default => 'image/jpeg',
        };
    }

    public function coverUrl(LabProject $project): ?string
    {
        $path = $this->coverPath($project);
        if ($path === null) {
            return null;
        }

        return route('lab.cover.show', $project).'?v='.filemtime($path);
    }

    public function putCover(LabProject $project, string $binary, string $extension): string
    {
        $ext = strtolower($extension);
        if ($ext === 'jpeg') {
            $ext = 'jpg';
        }
        if (! in_array($ext, ['webp', 'jpg', 'png'], true)) {
            $ext = 'jpg';
        }

        $root = $this->root($project);
        $dir = $root.DIRECTORY_SEPARATOR.self::COVER_DIR;
        File::ensureDirectoryExists($dir);

        foreach (self::COVER_NAMES as $name) {
            $existing = $dir.DIRECTORY_SEPARATOR.$name;
            if (is_file($existing)) {
                File::delete($existing);
            }
        }

        $path = $dir.DIRECTORY_SEPARATOR.'cover.'.$ext;
        File::put($path, $binary);

        return $path;
    }

    public function copyCover(LabProject $source, LabProject $target): void
    {
        $from = $this->coverPath($source);
        if ($from === null) {
            return;
        }

        $ext = strtolower((string) pathinfo($from, PATHINFO_EXTENSION));
        $this->putCover($target, (string) File::get($from), $ext);
    }

    /**
     * Zip the project source (no node_modules / build output).
     */
    public function archive(LabProject $project): string
    {
        $root = $this->ensure($project);
        $dir = storage_path('app/tmp');
        File::ensureDirectoryExists($dir);

        $path = $dir.'/lab-export-'.$project->uuid.'.zip';

        if (is_file($path)) {
            File::delete($path);
        }

        $zip = new \ZipArchive;

        if ($zip->open($path, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not create the export archive.');
        }

        $finder = Finder::create()
            ->files()
            ->in($root)
            ->ignoreDotFiles(false)
            ->exclude(self::HIDDEN_DIR_NAMES);

        foreach ($finder as $file) {
            $relative = str_replace('\\', '/', $file->getRelativePathname());
            $zip->addFile($file->getPathname(), $relative);
        }

        $zip->close();

        return $path;
    }
}
