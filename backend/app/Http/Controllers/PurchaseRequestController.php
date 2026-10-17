<?php

namespace App\Http\Controllers;

use App\Models\PurchaseRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PurchaseRequestController extends Controller
{
    public function index(): JsonResponse
    {
        $requests = PurchaseRequest::with([
            'supplier',
            'items.item',
        ])
            ->latest()
            ->paginate(15);

        return response()->json($requests);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => [
                'required',
                'integer',
                'distinct',
                'exists:items,id',
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $purchaseRequest = DB::transaction(function () use ($validated) {
            $purchaseRequest = PurchaseRequest::create([
                'request_number' => $this->generateRequestNumber(),
                'supplier_id' => $validated['supplier_id'],
                'status' => 'draft',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $purchaseRequest->items()->create([
                    'item_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                ]);
            }

            return $purchaseRequest;
        });

        return response()->json([
            'message' => 'Purchase request created successfully.',
            'data' => $purchaseRequest->load([
                'supplier',
                'items.item',
            ]),
        ], 201);
    }

    public function show(PurchaseRequest $purchaseRequest): JsonResponse
    {
        return response()->json([
            'data' => $purchaseRequest->load([
                'supplier',
                'items.item',
            ]),
        ]);
    }

    public function update(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): JsonResponse {
        $this->ensureDraft($purchaseRequest);

        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => [
                'required',
                'integer',
                'distinct',
                'exists:items,id',
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($validated, $purchaseRequest) {
            $purchaseRequest->update([
                'supplier_id' => $validated['supplier_id'],
                'notes' => $validated['notes'] ?? null,
            ]);

            $purchaseRequest->items()->delete();

            foreach ($validated['items'] as $item) {
                $purchaseRequest->items()->create([
                    'item_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                ]);
            }
        });

        return response()->json([
            'message' => 'Purchase request updated successfully.',
            'data' => $purchaseRequest->fresh()->load([
                'supplier',
                'items.item',
            ]),
        ]);
    }

    public function updateStatus(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): JsonResponse {
        $validated = $request->validate([
            'status' => [
                'required',
                'in:pending,approved,rejected',
            ],
        ]);

        $nextStatus = $validated['status'];
        $currentStatus = $purchaseRequest->status;

        $allowedTransitions = [
            'draft' => ['pending'],
            'pending' => ['approved', 'rejected'],
            'approved' => [],
            'rejected' => [],
        ];

        if (! in_array(
            $nextStatus,
            $allowedTransitions[$currentStatus] ?? [],
            true
        )) {
            throw ValidationException::withMessages([
                'status' => [
                    "Cannot change status from {$currentStatus} to {$nextStatus}.",
                ],
            ]);
        }

        $purchaseRequest->update([
            'status' => $nextStatus,
        ]);

        return response()->json([
            'message' => 'Purchase request status updated successfully.',
            'data' => $purchaseRequest->fresh()->load([
                'supplier',
                'items.item',
            ]),
        ]);
    }

    public function destroy(PurchaseRequest $purchaseRequest): JsonResponse
    {
        $this->ensureDraft($purchaseRequest);

        $purchaseRequest->delete();

        return response()->json([
            'message' => 'Purchase request deleted successfully.',
        ]);
    }

    private function ensureDraft(PurchaseRequest $purchaseRequest): void
    {
        if ($purchaseRequest->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => [
                    'Only draft purchase requests can be edited or deleted.',
                ],
            ]);
        }
    }

    private function generateRequestNumber(): string
    {
        do {
            $number = 'PR-' . now()->format('Ymd') . '-'
                . Str::upper(Str::random(6));
        } while (
            PurchaseRequest::where('request_number', $number)->exists()
        );

        return $number;
    }
}