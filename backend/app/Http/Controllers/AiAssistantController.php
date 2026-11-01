<?php

namespace App\Http\Controllers;

use App\Exceptions\RagServiceException;
use App\Services\RagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAssistantController extends Controller
{
    public function __construct(
        private readonly RagService $ragService,
    ) {
    }

    public function ask(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:1000'],
            'top_k' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ]);

        try {
            return response()->json($this->ragService->ask(
                trim($validated['question']),
                (int) ($validated['top_k'] ?? 5),
            ));
        } catch (RagServiceException $exception) {
            report($exception);

            $status = str_contains($exception->getMessage(), 'not configured')
                ? 503
                : 502;

            return response()->json([
                'message' => $exception->getMessage(),
            ], $status);
        }
    }
}
