<?php

namespace App\Ai\Lab;

/**
 * Canonical Lab tool definitions for native function/tool calling.
 * Names align with the client tool runtime (no MagicFlow naming).
 */
final class LabToolCatalog
{
    /**
     * OpenAI-compatible tools array.
     *
     * @return list<array<string, mixed>>
     */
    public function definitions(): array
    {
        return [
            $this->fn('list_dir', 'List entries under a VFS directory.', [
                'path' => ['type' => 'string', 'description' => 'Directory path (e.g. src)'],
            ], ['path']),
            $this->fn('file_search', 'Search workspace file paths by query or glob.', [
                'query' => ['type' => 'string'],
            ], ['query']),
            $this->fn('grep', 'Search file contents for a pattern.', [
                'pattern' => ['type' => 'string'],
                'path_prefix' => ['type' => 'string'],
            ], ['pattern']),
            $this->fn('read_file', 'Read a file (optional line window).', [
                'path' => ['type' => 'string'],
                'start_line' => ['type' => 'integer'],
                'end_line' => ['type' => 'integer'],
            ], ['path']),
            $this->fn('write_file', 'Atomic full-file overwrite into Working VFS. REQUIRED for every create or edit — emit the COMPLETE balanced file body in one pass (every tag, brace, and string closed). Always overwrite src/App.jsx in the same turn as the first sections so Preview is not a blank canvas. There is no apply_patch / search-replace tool.', [
                'path' => ['type' => 'string'],
                'content' => ['type' => 'string'],
            ], ['path', 'content']),
            $this->fn('lookup_visuals', 'Fetch licensed stock photographs that match a scene. Call this in its own round BEFORE write_file whenever a page needs real photos (hero, product, team, interior, food). Use each returned src as img src. Never invent Unsplash/Pixabay IDs or placeholder URLs. If the result list is empty, use CSS or illustration instead of fake photos.', [
                'query' => ['type' => 'string', 'description' => 'Concrete English scene, e.g. "espresso bar interior" or "trail running shoes on rock"'],
                'count' => ['type' => 'integer', 'description' => 'How many photographs to return (1–8, default 4)'],
                'orientation' => ['type' => 'string', 'enum' => ['landscape', 'portrait', 'square'], 'description' => 'Optional crop hint'],
            ], ['query']),
            $this->fn('survey_datastore', 'Inspect the workspace data plane (Supabase). Returns connection status, public tables/columns, whether schema revisions are allowed, and the publishable client env (URL + anon key). Call this BEFORE write_file whenever the brief needs auth, CRUD, waitlists, or live data. Never invent table names — use the returned map. Steward / service-role keys are never returned.', [
                'fresh' => ['type' => 'boolean', 'description' => 'Skip the short schema cache and re-read the live project'],
            ], []),
            $this->fn('revise_datastore', 'Apply SQL against the connected data plane after survey_datastore. Use for CREATE/ALTER tables, RLS, indexes, functions, and seed INSERT. Destructive SQL (DROP / ALTER / DELETE / GRANT) requires acknowledge_destructive=true. Never send service-role keys to the VFS. After a successful apply, call survey_datastore again.', [
                'sql' => ['type' => 'string', 'description' => 'One or more SQL statements (semicolon-separated)'],
                'acknowledge_destructive' => ['type' => 'boolean', 'description' => 'Required when the SQL drops, alters, deletes, or changes grants'],
            ], ['sql']),
            $this->fn('github_status', 'Read the GitHub connection and this project remote (linked account, owner/repo/branch, local vs remote tree). Call before push/pull/fork when the user mentions GitHub, git, or version control.', [
                'compare' => ['type' => 'boolean', 'description' => 'Include local vs GitHub tree (added/modified/removed)'],
            ], []),
            $this->fn('github_compare', 'Diff the Lab workspace against the linked GitHub git tree (tree vs). Returns added, modified, and removed paths. Use when the user asks what changed vs GitHub.', [
                'path_prefix' => ['type' => 'string', 'description' => 'Optional path prefix to filter the diff (e.g. src)'],
            ], []),
            $this->fn('github_push', 'Commit the current Lab workspace to the linked GitHub repo via the Git Data API (no git CLI). Link or create a repo first if github_status has no remote.', [
                'message' => ['type' => 'string', 'description' => 'Commit message'],
                'force' => ['type' => 'boolean', 'description' => 'Overwrite the remote branch when it has diverged'],
            ], []),
            $this->fn('github_pull', 'Pull a GitHub branch into this Lab workspace, overlaying remote files. Use when the user wants to sync from GitHub.', [
                'branch' => ['type' => 'string', 'description' => 'Branch to pull (defaults to the linked remote branch)'],
            ], []),
            $this->fn('github_fork', 'Fork a public GitHub repository into the connected account and optionally import it into this Lab project.', [
                'owner' => ['type' => 'string', 'description' => 'Source owner'],
                'repo' => ['type' => 'string', 'description' => 'Source repository name'],
                'url' => ['type' => 'string', 'description' => 'Full GitHub URL as an alternative to owner/repo'],
                'import' => ['type' => 'boolean', 'description' => 'Import the fork into this workspace after forking'],
                'branch' => ['type' => 'string'],
            ], []),
            $this->fn('github_link', 'Attach this Lab project to an existing GitHub repository the user owns (or a fork). Does not import files — use github_pull after, or import first.', [
                'owner' => ['type' => 'string'],
                'repo' => ['type' => 'string'],
                'url' => ['type' => 'string'],
                'branch' => ['type' => 'string'],
                'root_directory' => ['type' => 'string', 'description' => 'Optional monorepo prefix, e.g. apps/web'],
            ], []),
            $this->fn('github_create_repo', 'Create a new GitHub repository on the connected account and link it to this Lab project. Pushes the workspace as the initial commit unless push=false.', [
                'name' => ['type' => 'string', 'description' => 'Repository name'],
                'private' => ['type' => 'boolean'],
                'description' => ['type' => 'string'],
                'push' => ['type' => 'boolean', 'description' => 'Push the workspace after create (default true)'],
            ], []),
        ];
    }

    /**
     * @param  array<string, array<string, mixed>>  $properties
     * @param  list<string>  $required
     * @return array<string, mixed>
     */
    private function fn(string $name, string $description, array $properties, array $required): array
    {
        return [
            'type' => 'function',
            'function' => [
                'name' => $name,
                'description' => $description,
                'parameters' => [
                    'type' => 'object',
                    'properties' => $properties,
                    'required' => $required,
                ],
            ],
        ];
    }
}
