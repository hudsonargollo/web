<?php

return [

    /*
    |--------------------------------------------------------------------------
    | GitHub import
    |--------------------------------------------------------------------------
    | Public zipball + per-user OAuth via WorkspaceOauthAppStore.
    | Uses PHP ZipArchive only — no git CLI (shared hosting friendly).
    */
    'github' => [
        'user_agent' => env('GITHUB_USER_AGENT', 'Krikkit-Lab'),
        'timeout' => (int) env('LAB_GITHUB_TIMEOUT', 60),
        'connect_timeout' => (int) env('LAB_GITHUB_CONNECT_TIMEOUT', 15),
        'disable_proxy' => filter_var(env('LAB_GITHUB_DISABLE_PROXY', true), FILTER_VALIDATE_BOOL),
        'force_ipv4' => filter_var(env('LAB_GITHUB_FORCE_IPV4', true), FILTER_VALIDATE_BOOL),
        'max_zip_bytes' => (int) env('LAB_GITHUB_MAX_ZIP_BYTES', 25 * 1024 * 1024),
        'max_files' => (int) env('LAB_GITHUB_MAX_FILES', 2500),
        'max_file_bytes' => (int) env('LAB_GITHUB_MAX_FILE_BYTES', 2 * 1024 * 1024),
        /** Cache resolved repo glyph kinds keyed by full_name + updated_at (seconds). */
        'kind_cache_ttl' => (int) env('LAB_GITHUB_KIND_CACHE_TTL', 3600),
    ],

    /*
    |--------------------------------------------------------------------------
    | Publish
    |--------------------------------------------------------------------------
    | Public sites are served by Host header on this same app:
    |   {subdomain}.{APP_URL host}
    |   or a verified custom domain (CNAME to APP_URL host, plus TXT).
    | Point the wildcard at this app's document root.
    | Production builds run in the user's browser; the server only receives dist/.
    */
    'publish' => [
        'artifact_max_bytes' => (int) env('LAB_PUBLISH_ARTIFACT_MAX_BYTES', 50 * 1024 * 1024),
        'artifact_max_files' => (int) env('LAB_PUBLISH_ARTIFACT_MAX_FILES', 5000),
        'reserved' => [],
    ],

    /*
    |--------------------------------------------------------------------------
    | Build gate auto-switch
    |--------------------------------------------------------------------------
    | When true, the Build Gate timer auto-clicks Switch after the countdown.
    | On by default. Set LAB_AUTO_SWITCH_GATE=false to disable.
    */
    'auto_switch_gate' => filter_var(env('LAB_AUTO_SWITCH_GATE', true), FILTER_VALIDATE_BOOL),
    'auto_switch_gate_ms' => (int) env('LAB_AUTO_SWITCH_GATE_MS', 15_000),

];
