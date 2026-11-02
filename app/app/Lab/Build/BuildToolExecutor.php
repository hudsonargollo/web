<?php

namespace App\Lab\Build;

use App\Ai\Data\ToolCall;
use App\Lab\SiteWorkspace;
use App\Models\LabProject;
use Throwable;

/**
 * Server-side equivalent of the browser's tool applier. Only tools that make
 * sense without a UI are implemented; everything else returns an explicit
 * failure so the model stops asking instead of looping on a silent no-op.
 */
final class BuildToolExecutor
{
    private const MAX_TOOL_OUTPUT = 8000;

    public function __construct(private readonly SiteWorkspace $workspace) {}

    /**
     * @param  list<ToolCall>  $calls
     * @return array{results: list<array<string, mixed>>, wrote: int, errors: list<string>}
     */
    public function apply(LabProject $project, array $calls, int $maxFileBytes, int $maxTotalBytes): array
    {
        $results = [];
        $errors = [];
        $wrote = 0;

        foreach ($calls as $call) {
            try {
                $output = $this->dispatch($project, $call, $maxFileBytes, $maxTotalBytes, $wrote);
                $results[] = ['id' => $call->id, 'name' => $call->name, 'ok' => true, 'output' => $output];
            } catch (Throwable $e) {
                $message = $call->name.' failed: '.$e->getMessage();
                $errors[] = $message;
                $results[] = ['id' => $call->id, 'name' => $call->name, 'ok' => false, 'output' => $message];
            }
        }

        return ['results' => $results, 'wrote' => $wrote, 'errors' => $errors];
    }

    private function dispatch(LabProject $project, ToolCall $call, int $maxFileBytes, int $maxTotalBytes, int &$wrote): string
    {
        return match ($call->name) {
            'write_file' => $this->writeFile($project, $call, $maxFileBytes, $maxTotalBytes, $wrote),
            'read_file' => $this->truncate($this->workspace->read($project, $this->path($call))),
            'list_dir' => $this->listDir($project, (string) ($call->arguments['path'] ?? '')),
            'file_search' => $this->fileSearch($project, (string) ($call->arguments['query'] ?? '')),
            'grep' => $this->grep($project, (string) ($call->arguments['pattern'] ?? '')),
            default => throw new BuildException(
                'tool "'.$call->name.'" is unavailable in headless builds; use write_file with complete static files'
            ),
        };
    }

    private function writeFile(LabProject $project, ToolCall $call, int $maxFileBytes, int $maxTotalBytes, int &$wrote): string
    {
        $path = $this->path($call);
        $content = (string) ($call->arguments['content'] ?? '');
        $bytes = strlen($content);

        if ($bytes > $maxFileBytes) {
            throw new BuildException("{$path} is {$bytes} bytes, over the {$maxFileBytes} byte per-file limit");
        }

        if ($bytes > $maxTotalBytes - $wrote) {
            throw new BuildException("writing {$path} would exceed the remaining build budget");
        }

        $this->workspace->write($project, $path, $content);
        $wrote += $bytes;

        return json_encode(['ok' => true, 'path' => $path, 'bytes' => $bytes], JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    private function listDir(LabProject $project, string $dir): string
    {
        $prefix = trim($dir, '/');
        $paths = [];

        foreach ($this->flatten($this->workspace->tree($project)) as $path) {
            if ($prefix === '' || $path === $prefix || str_starts_with($path, $prefix.'/')) {
                $paths[] = $path;
            }
        }

        return $this->truncate((string) json_encode($paths, JSON_UNESCAPED_SLASHES));
    }

    private function fileSearch(LabProject $project, string $query): string
    {
        $needle = strtolower(trim($query));

        if ($needle === '') {
            return '[]';
        }

        $matches = [];

        foreach ($this->flatten($this->workspace->tree($project)) as $path) {
            if (str_contains(strtolower($path), $needle)) {
                $matches[] = $path;
            }
        }

        return $this->truncate((string) json_encode(array_slice($matches, 0, 50), JSON_UNESCAPED_SLASHES));
    }

    private function grep(LabProject $project, string $pattern): string
    {
        $pattern = trim($pattern);

        if ($pattern === '') {
            return '[]';
        }

        $hits = [];
        $isRegex = @preg_match('~'.$pattern.'~', '') !== false;

        foreach ($this->flatten($this->workspace->tree($project)) as $path) {
            try {
                $lines = explode("\n", $this->workspace->read($project, $path));
            } catch (Throwable) {
                continue;
            }

            foreach ($lines as $number => $line) {
                $matched = $isRegex
                    ? (bool) @preg_match('~'.$pattern.'~', $line)
                    : str_contains($line, $pattern);

                if ($matched) {
                    $hits[] = $path.':'.($number + 1).': '.trim(substr($line, 0, 200));

                    if (count($hits) >= 50) {
                        return $this->truncate((string) json_encode($hits, JSON_UNESCAPED_SLASHES));
                    }
                }
            }
        }

        return $this->truncate((string) json_encode($hits, JSON_UNESCAPED_SLASHES));
    }

    /**
     * @param  list<array<string, mixed>>  $nodes
     * @return list<string>
     */
    private function flatten(array $nodes, string $base = ''): array
    {
        $paths = [];

        foreach ($nodes as $node) {
            $path = (string) ($node['path'] ?? '');

            if (($node['type'] ?? '') === 'folder') {
                $children = is_array($node['children'] ?? null) ? $node['children'] : [];
                $paths = [...$paths, ...$this->flatten($children, $path)];

                continue;
            }

            $paths[] = $path !== '' ? $path : $base.(string) ($node['name'] ?? '');
        }

        return $paths;
    }

    private function path(ToolCall $call): string
    {
        $path = trim((string) ($call->arguments['path'] ?? ''), '/ ');

        if ($path === '') {
            throw new BuildException('write_file requires a non-empty path');
        }

        return $path;
    }

    private function truncate(string $output): string
    {
        return strlen($output) > self::MAX_TOOL_OUTPUT
            ? substr($output, 0, self::MAX_TOOL_OUTPUT)."\n...[truncated]"
            : $output;
    }
}
