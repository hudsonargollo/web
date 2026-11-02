<?php

use App\Http\Controllers\Api\V1\BuildController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('auth.apikey')->group(function (): void {
    Route::post('/builds', [BuildController::class, 'store']);
    Route::get('/builds/{build}', [BuildController::class, 'show']);
    Route::post('/builds/{build}/publish', [BuildController::class, 'publish']);
    Route::delete('/builds/{build}', [BuildController::class, 'destroy']);
});
