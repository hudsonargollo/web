<?php

namespace App\Http\Controllers\Lab;

use App\Ai\ModelCatalog;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class LabModelsController extends Controller
{
    public function __invoke(ModelCatalog $catalog): JsonResponse
    {
        return response()->json($catalog->toPickerPayload(onlyAvailable: false));
    }
}
