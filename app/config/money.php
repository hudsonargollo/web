<?php

return [
    /*
     |--------------------------------------------------------------------------
     | Laravel money
     |--------------------------------------------------------------------------
     */
    'locale' => env('MONEY_LOCALE', 'en_US'),
    'defaultCurrency' => env('APP_CURRENCY', 'USD'),
    'defaultFormatter' => null,
    'defaultSerializer' => null,
    'isoCurrenciesPath' => is_dir(__DIR__.'/../vendor')
        ? __DIR__.'/../vendor/moneyphp/money/resources/currency.php'
        : __DIR__.'/../../../moneyphp/money/resources/currency.php',
    'currencies' => [
        'iso' => 'all',
        'bitcoin' => [],
        'custom' => [
            // 'MY1' => 2,
            // 'MY2' => 3
        ],
    ],
];
