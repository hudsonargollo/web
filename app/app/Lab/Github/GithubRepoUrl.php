<?php

namespace App\Lab\Github;

use InvalidArgumentException;

/**
 * Parse public GitHub repository URLs / shorthand into owner + repo.
 */
final class GithubRepoUrl
{
    /**
     * @return array{owner: string, repo: string}
     */
    public static function parse(string $input): array
    {
        $raw = trim($input);

        if ($raw === '') {
            throw new InvalidArgumentException(__('dashboard.Enter a public GitHub repository URL.'));
        }

        if (preg_match('#^([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$#', $raw, $m) === 1) {
            return self::pair($m[1], $m[2]);
        }

        $normalized = preg_replace('#\.git$#', '', $raw) ?? $raw;

        if (preg_match(
            '#^(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)(?:/.*)?$#i',
            $normalized,
            $m,
        ) === 1) {
            return self::pair($m[1], $m[2]);
        }

        throw new InvalidArgumentException(__('dashboard.Enter a valid GitHub repository URL (https://github.com/owner/repo).'));
    }

    /**
     * @return array{owner: string, repo: string}
     */
    private static function pair(string $owner, string $repo): array
    {
        $repo = preg_replace('#\.git$#i', '', $repo) ?? $repo;

        if ($owner === '' || $repo === '' || str_contains($owner, '..') || str_contains($repo, '..')) {
            throw new InvalidArgumentException(__('dashboard.Enter a valid GitHub repository URL (https://github.com/owner/repo).'));
        }

        return [
            'owner' => $owner,
            'repo' => $repo,
        ];
    }
}
