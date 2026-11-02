<?php

/**
 * Stock photograph catalogs used by Lab (lookup_visuals).
 * Keys stay on the server — generated sites only receive public image URLs.
 * Dashboard → API Integration stores workspace keys (env is the fallback).
 */
return [

    'http' => [
        'timeout' => (int) env('VISUALS_HTTP_TIMEOUT', 8),
    ],

    'cache_seconds' => (int) env('VISUALS_CACHE_SECONDS', 600),

    'max_per_query' => 8,

    'catalogs' => [

        'unsplash' => [
            'label' => 'Unsplash',
            'application_id' => env('UNSPLASH_APPLICATION_ID'),
            'api_key' => env('UNSPLASH_ACCESS_KEY'),
            'api_secret' => env('UNSPLASH_SECRET_KEY'),
            'search_url' => 'https://api.unsplash.com/search/photos',
        ],

        'pixabay' => [
            'label' => 'Pixabay',
            'api_key' => env('PIXABAY_API_KEY'),
            'search_url' => 'https://pixabay.com/api/',
        ],

    ],

];
