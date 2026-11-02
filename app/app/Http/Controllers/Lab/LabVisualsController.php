<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Visuals\VisualLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabVisualsController extends Controller
{
    public function __invoke(Request $request, VisualLookup $lookup): JsonResponse
    {
        $query = trim((string) $request->input('query', ''));
        if ($query === '' || mb_strlen($query) > 80) {
            return response()->json(['message' => 'A scene query is required.'], 422);
        }

        $count = (int) $request->integer('count', 4);
        $orientation = strtolower(trim((string) $request->input('orientation', '')));
        if (! in_array($orientation, ['landscape', 'portrait', 'square'], true)) {
            $orientation = null;
        }

        return response()->json($lookup->find(
            query: $query,
            count: $count > 0 ? $count : 4,
            orientation: $orientation,
        ));
    }
}
