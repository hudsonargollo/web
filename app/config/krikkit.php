<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Machine builds (MoneyMachine)
    |--------------------------------------------------------------------------
    | Headless builds run through the same ChatGateway as the browser, but with
    | no human to approve turns. Every limit here is a runaway guard.
    */
    'build' => [
        'model' => env('KRIKKIT_BUILD_MODEL', ''),
        'service_user_id' => (int) env('KRIKKIT_BUILD_SERVICE_USER_ID', 0),
        'max_turns' => (int) env('KRIKKIT_BUILD_MAX_TURNS', 40),
        'wall_clock_seconds' => (int) env('KRIKKIT_BUILD_WALL_CLOCK', 600),
        'max_file_bytes' => (int) env('KRIKKIT_BUILD_MAX_FILE_BYTES', 2 * 1024 * 1024),
        'max_total_bytes' => (int) env('KRIKKIT_BUILD_MAX_TOTAL_BYTES', 50 * 1024 * 1024),
        'repeat_error_limit' => 3,
        'provider_attempts' => (int) env('KRIKKIT_BUILD_PROVIDER_ATTEMPTS', 4),
        'provider_backoff_seconds' => (int) env('KRIKKIT_BUILD_PROVIDER_BACKOFF', 5),
    ],

    'callback' => [
        'url' => env('KRIKKIT_CALLBACK_URL', ''),
        'secret' => env('KRIKKIT_CALLBACK_SECRET', ''),
    ],

];
