<?php

namespace App\Http\Controllers;

use App\Models\GoodsReceipt;
use App\Models\InventoryMovement;
use App\Models\Item;
use App\Models\PurchaseRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function show(): JsonResponse
    {
        $inventoryTotals = Item::query()
            ->selectRaw('COUNT(*) as total_items')
            ->selectRaw('COALESCE(SUM(quantity), 0) as total_stock_quantity')
            ->selectRaw(
                'SUM(CASE WHEN quantity > 0 AND quantity <= reorder_level THEN 1 ELSE 0 END) as low_stock_items'
            )
            ->selectRaw(
                'SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_items'
            )
            ->first();

        $stockStatus = [
            'in_stock' => (int) Item::query()
                ->whereColumn('quantity', '>', 'reorder_level')
                ->count(),
            'low_stock' => (int) Item::query()
                ->where('quantity', '>', 0)
                ->whereColumn('quantity', '<=', 'reorder_level')
                ->count(),
            'out_of_stock' => (int) Item::query()
                ->where('quantity', 0)
                ->count(),
        ];

        $movementStart = now()->subDays(29)->startOfDay();
        $movementRows = InventoryMovement::query()
            ->selectRaw('DATE(created_at) as date')
            ->selectRaw("SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as incoming")
            ->selectRaw("SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as outgoing")
            ->where('created_at', '>=', $movementStart)
            ->groupByRaw('DATE(created_at)')
            ->orderByRaw('DATE(created_at)')
            ->get()
            ->keyBy('date');

        $movementTrends = [];
        for ($offset = 29; $offset >= 0; $offset--) {
            $date = now()->subDays($offset)->toDateString();
            $row = $movementRows->get($date);
            $movementTrends[] = [
                'date' => $date,
                'incoming' => (int) ($row->incoming ?? 0),
                'outgoing' => (int) ($row->outgoing ?? 0),
            ];
        }

        $requestStatusCounts = PurchaseRequest::query()
            ->selectRaw('status')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $statuses = ['draft', 'pending', 'approved', 'rejected'];
        $requestStatusBreakdown = collect($statuses)->map(fn (string $status) => [
            'status' => $status,
            'count' => (int) ($requestStatusCounts->get($status, 0)),
        ])->values();

        $requestedTotals = DB::table('purchase_request_items')
            ->select('purchase_request_id')
            ->selectRaw('SUM(quantity) as requested_quantity')
            ->groupBy('purchase_request_id');

        $receivedTotals = DB::table('purchase_request_items as pri')
            ->join(
                'goods_receipt_items as gri',
                'pri.id',
                '=',
                'gri.purchase_request_item_id'
            )
            ->select('pri.purchase_request_id')
            ->selectRaw('SUM(gri.quantity_received) as received_quantity')
            ->groupBy('pri.purchase_request_id');

        $pendingReceiving = DB::query()
            ->fromSub($requestedTotals, 'requested')
            ->join('purchase_requests as pr', 'requested.purchase_request_id', '=', 'pr.id')
            ->leftJoinSub($receivedTotals, 'received', function ($join) {
                $join->on('requested.purchase_request_id', '=', 'received.purchase_request_id');
            })
            ->where('pr.status', 'approved')
            ->whereRaw(
                'COALESCE(received.received_quantity, 0) < requested.requested_quantity'
            )
            ->distinct()
            ->count('pr.id');

        $activities = [];

        $movements = InventoryMovement::query()
            ->with('item:id,name,sku')
            ->latest()
            ->limit(8)
            ->get();
        foreach ($movements as $movement) {
            $activities[] = [
                'id' => "movement-{$movement->id}",
                'type' => 'inventory_movement',
                'description' => $movement->type === 'in'
                    ? 'Stock added'
                    : 'Stock issued',
                'record' => $movement->item?->name ?? 'Inventory item',
                'reference' => $movement->item?->sku,
                'status' => $movement->type === 'in' ? 'Incoming' : 'Outgoing',
                'quantity' => (int) $movement->quantity,
                'occurred_at' => $movement->created_at?->toIso8601String(),
            ];
        }

        $purchaseRequests = PurchaseRequest::query()
            ->with('supplier:id,name')
            ->latest()
            ->limit(8)
            ->get();
        foreach ($purchaseRequests as $purchaseRequest) {
            $activities[] = [
                'id' => "purchase-request-{$purchaseRequest->id}",
                'type' => 'purchase_request',
                'description' => 'Purchase request created',
                'record' => $purchaseRequest->request_number,
                'reference' => $purchaseRequest->supplier?->name,
                'status' => ucfirst($purchaseRequest->status),
                'quantity' => null,
                'occurred_at' => $purchaseRequest->created_at?->toIso8601String(),
            ];

            if ($purchaseRequest->status === 'approved') {
                $activities[] = [
                    'id' => "approved-request-{$purchaseRequest->id}",
                    'type' => 'purchase_request_approved',
                    'description' => 'Purchase request status updated',
                    'record' => $purchaseRequest->request_number,
                    'reference' => $purchaseRequest->supplier?->name,
                    'status' => 'Approved',
                    'quantity' => null,
                    'occurred_at' => $purchaseRequest->updated_at?->toIso8601String(),
                ];
            }
        }

        $receipts = GoodsReceipt::query()
            ->with([
                'supplier:id,name',
                'purchaseRequest:id,request_number',
            ])
            ->latest('received_at')
            ->limit(8)
            ->get();
        foreach ($receipts as $receipt) {
            $activities[] = [
                'id' => "goods-receipt-{$receipt->id}",
                'type' => 'goods_receipt',
                'description' => 'Goods received',
                'record' => $receipt->receipt_number,
                'reference' => $receipt->purchaseRequest?->request_number,
                'status' => 'Received',
                'quantity' => null,
                'occurred_at' => $receipt->received_at?->toIso8601String(),
            ];
        }

        usort($activities, fn (array $a, array $b) =>
            strcmp((string) $b['occurred_at'], (string) $a['occurred_at'])
        );
        $activities = array_slice($activities, 0, 12);

        return response()->json([
            'data' => [
                'inventory' => [
                    'total_items' => (int) ($inventoryTotals->total_items ?? 0),
                    'total_stock_quantity' => (int) ($inventoryTotals->total_stock_quantity ?? 0),
                    'low_stock_items' => (int) ($inventoryTotals->low_stock_items ?? 0),
                    'out_of_stock_items' => (int) ($inventoryTotals->out_of_stock_items ?? 0),
                    'stock_status' => $stockStatus,
                    'movement_trends' => $movementTrends,
                ],
                'procurement' => [
                    'total_suppliers' => DB::table('suppliers')->count(),
                    'pending_requests' => (int) ($requestStatusCounts->get('pending', 0)),
                    'approved_requests' => (int) ($requestStatusCounts->get('approved', 0)),
                    'pending_receiving' => (int) $pendingReceiving,
                    'request_status_breakdown' => $requestStatusBreakdown,
                ],
                'recent_activities' => $activities,
            ],
        ]);
    }
}
