<?php

/**
 * Lab data-plane backends (Supabase today).
 * Steward / console tokens stay on the server. Survey may return the
 * publishable key so the agent can wire a browser client into the VFS.
 * Lab users attach a project via Organization OAuth. Env keys are a local fallback.
 */
return [

    'http' => [
        'timeout' => (int) env('DATASTORE_HTTP_TIMEOUT', 12),
        'revise_timeout' => (int) env('DATASTORE_REVISE_TIMEOUT', 30),
    ],

    'schema_cache_seconds' => (int) env('DATASTORE_SCHEMA_CACHE_SECONDS', 45),

    'kinds' => [

        'supabase' => [
            'label' => 'Supabase',
            'host_url' => env('SUPABASE_URL', ''),
            'publishable_token' => env('SUPABASE_ANON_KEY', ''),
            'steward_token' => env('SUPABASE_SERVICE_ROLE_KEY', ''),
            'console_token' => env('SUPABASE_ACCESS_TOKEN', ''),
            'console_base' => env('SUPABASE_API_URL', 'https://api.supabase.com'),
        ],

    ],

];
