<?php

return [

    'stripe' => [
        'public_key' => env('STRIPE_PUBLIC_KEY', ''),
        'secret_key' => env('STRIPE_SECRET_KEY', ''),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET', ''),
        'mode' => env('STRIPE_MODE', 'test'),
    ],

    'paypal' => [
        'public_key' => env('PAYPAL_CLIENT_ID', ''),
        'secret_key' => env('PAYPAL_CLIENT_SECRET', ''),
        'webhook_secret' => env('PAYPAL_WEBHOOK_ID', ''),
        'mode' => env('PAYPAL_MODE', 'test'),
    ],

];
