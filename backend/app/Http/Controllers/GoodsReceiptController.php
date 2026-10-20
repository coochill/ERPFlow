<?php

namespace App\Http\Controllers;

use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\Item;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GoodsReceiptController extends Controller
{
    public function index(): JsonResponse
    {
        $receipts = GoodsReceipt::with([
            'purchaseRequest',
            'supplier',
            'receivedBy',
            'items.purchaseRequestItem.item',
        ])
            ->latest()
            ->paginate(15);

        return response()->json($receipts);
    }

    public function show(GoodsReceipt $goodsReceipt): JsonResponse
    {
        return response()->json([
            'data' => $goodsReceipt->load([
                'purchaseRequest',
                'supplier',
                'receivedBy',
                'items.purchaseRequestItem.item',
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchase_request_id' => [
                'required',
                'integer',
                'exists:purchase_requests,id',
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.purchase_request_item_id' => [
                'required',
                'integer',
                'distinct',
                'exists:purchase_request_items,id',
            ],
            'items.*.quantity_received' => [
                'required',
                'integer',
                'min:1',
            ],
        ]);

        $receipt = DB::transaction(function () use (
            $validated,
            $request
        ) {
            // Serialize receipts for the same purchase request.
            $purchaseRequest = PurchaseRequest::query()
                ->whereKey($validated['purchase_request_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($purchaseRequest->status !== 'approved') {
                throw ValidationException::withMessages([
                    'purchase_request_id' => [
                        'Goods can only be received for approved purchase requests.',
                    ],
                ]);
            }

            $requestedIds = collect($validated['items'])
                ->pluck('purchase_request_item_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            // Ensure every submitted line belongs to this request.
            $requestItems = PurchaseRequestItem::query()
                ->where('purchase_request_id', $purchaseRequest->id)
                ->whereIn('id', $requestedIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($requestItems->count() !== count($requestedIds)) {
                throw ValidationException::withMessages([
                    'items' => [
                        'Every received item must belong to the selected purchase request.',
                    ],
                ]);
            }

            // Lock stock records in a consistent order.
            $inventoryItems = Item::query()
                ->whereIn('id', $requestItems->pluck('item_id')->unique())
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // Calculate quantities received on earlier receipts.
            $previouslyReceived = GoodsReceiptItem::query()
                ->select('purchase_request_item_id')
                ->selectRaw('SUM(quantity_received) AS total_received')
                ->whereIn('purchase_request_item_id', $requestedIds)
                ->groupBy('purchase_request_item_id')
                ->pluck('total_received', 'purchase_request_item_id');

            foreach ($validated['items'] as $line) {
                $requestItem = $requestItems->get(
                    (int) $line['purchase_request_item_id']
                );

                $alreadyReceived = (int) (
                    $previouslyReceived->get($requestItem->id, 0)
                );

                $newTotal = $alreadyReceived
                    + (int) $line['quantity_received'];

                if ($newTotal > $requestItem->quantity) {
                    throw ValidationException::withMessages([
                        'items' => [
                            "Received quantity for item {$requestItem->id} "
                            . "would exceed the requested quantity of "
                            . "{$requestItem->quantity}. Already received: "
                            . "{$alreadyReceived}.",
                        ],
                    ]);
                }
            }

            $receipt = $purchaseRequest->goodsReceipts()->create([
                'receipt_number' => $this->generateReceiptNumber(),
                'supplier_id' => $purchaseRequest->supplier_id,
                'received_by' => $request->user()?->id,
                'received_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $line) {
                $requestItem = $requestItems->get(
                    (int) $line['purchase_request_item_id']
                );

                $quantity = (int) $line['quantity_received'];
                $inventoryItem = $inventoryItems->get(
                    $requestItem->item_id
                );

                $receipt->items()->create([
                    'purchase_request_item_id' => $requestItem->id,
                    'quantity_received' => $quantity,
                    'unit_price' => $requestItem->unit_price,
                ]);

                $inventoryItem->increment('quantity', $quantity);

                $inventoryItem->inventoryMovements()->create([
                    'goods_receipt_id' => $receipt->id,
                    'type' => 'in',
                    'quantity' => $quantity,
                    'reason' => "Goods receipt {$receipt->receipt_number}",
                ]);
            }

            return $receipt;
        });

        return response()->json([
            'message' => 'Goods received and inventory updated successfully.',
            'data' => $receipt->load([
                'purchaseRequest',
                'supplier',
                'receivedBy',
                'items.purchaseRequestItem.item',
            ]),
        ], 201);
    }

    private function generateReceiptNumber(): string
    {
        do {
            $number = 'GR-' . now()->format('Ymd') . '-'
                . Str::upper(Str::random(6));
        } while (
            GoodsReceipt::where('receipt_number', $number)->exists()
        );

        return $number;
    }
}
