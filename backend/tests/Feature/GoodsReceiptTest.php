<?php

namespace Tests\Feature;

use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\InventoryMovement;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoodsReceiptTest extends TestCase
{
    use RefreshDatabase;

    private function createSupplier(): int
    {
        return \DB::table('suppliers')->insertGetId([
            'name' => 'Test Supplier',
            'contact_name' => 'Test Contact',
            'email' => 'supplier@example.com',
            'phone' => '09171234567',
            'address' => 'Test Address',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createItem(): int
    {
        return \DB::table('items')->insertGetId([
            'sku' => 'TEST-GR-001',
            'name' => 'Test Inventory Item',
            'description' => 'Goods receipt test item',
            'quantity' => 10,
            'reorder_level' => 2,
            'unit_price' => 500,
            'unit' => 'piece',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_goods_receipt_increases_inventory_and_creates_inbound_movement(): void
    {
        $supplierId = $this->createSupplier();
        $itemId = $this->createItem();

        $purchaseRequestId = PurchaseRequest::query()->insertGetId([
            'request_number' => 'PR-TEST-001',
            'supplier_id' => $supplierId,
            'status' => 'approved',
            'notes' => 'Goods receipt test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $purchaseRequestItemId = PurchaseRequestItem::query()->insertGetId([
            'purchase_request_id' => $purchaseRequestId,
            'item_id' => $itemId,
            'quantity' => 5,
            'unit_price' => 500,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->postJson('/api/goods-receipts', [
            'purchase_request_id' => $purchaseRequestId,
            'notes' => 'First delivery',
            'items' => [
                [
                    'purchase_request_item_id' => $purchaseRequestItemId,
                    'quantity_received' => 2,
                ],
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.purchase_request_id', $purchaseRequestId)
            ->assertJsonPath('data.supplier_id', $supplierId);

        $receiptId = $response->json('data.id');

        $this->assertDatabaseHas('goods_receipts', [
            'id' => $receiptId,
            'purchase_request_id' => $purchaseRequestId,
            'supplier_id' => $supplierId,
            'notes' => 'First delivery',
        ]);

        $this->assertDatabaseHas('goods_receipt_items', [
            'goods_receipt_id' => $receiptId,
            'purchase_request_item_id' => $purchaseRequestItemId,
            'quantity_received' => 2,
            'unit_price' => '500.00',
        ]);

        $this->assertDatabaseHas('items', [
            'id' => $itemId,
            'quantity' => 12,
        ]);

        $this->assertDatabaseHas('inventory_movements', [
            'item_id' => $itemId,
            'goods_receipt_id' => $receiptId,
            'type' => 'in',
            'quantity' => 2,
        ]);

        $this->assertSame(1, GoodsReceipt::query()->count());
        $this->assertSame(1, GoodsReceiptItem::query()->count());

        $movement = InventoryMovement::query()
            ->where('goods_receipt_id', $receiptId)
            ->firstOrFail();

        $this->assertSame('in', $movement->type);
        $this->assertSame(2, $movement->quantity);
    }
    private function createApprovedPurchaseRequestWithItem(
    int $supplierId,
    int $itemId,
    int $quantity,
    string $requestNumber
): int {
    $purchaseRequestId = \DB::table('purchase_requests')->insertGetId([
        'request_number' => $requestNumber,
        'supplier_id' => $supplierId,
        'status' => 'approved',
        'notes' => 'Goods receipt test request',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return \DB::table('purchase_request_items')->insertGetId([
        'purchase_request_id' => $purchaseRequestId,
        'item_id' => $itemId,
        'quantity' => $quantity,
        'unit_price' => 500,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

    public function test_partial_receipts_cannot_exceed_requested_quantity(): void
{
    $supplierId = $this->createSupplier();
    $itemId = $this->createItem();

    $purchaseRequestItemId =
        $this->createApprovedPurchaseRequestWithItem(
            $supplierId,
            $itemId,
            5,
            'PR-PARTIAL-001'
        );

    // First delivery: 2 of 5 units.
    $firstReceipt = $this->postJson('/api/goods-receipts', [
        'purchase_request_id' => \DB::table('purchase_request_items')
            ->where('id', $purchaseRequestItemId)
            ->value('purchase_request_id'),
        'notes' => 'First partial delivery',
        'items' => [
            [
                'purchase_request_item_id' => $purchaseRequestItemId,
                'quantity_received' => 2,
            ],
        ],
    ]);

    $firstReceipt->assertCreated();

    $this->assertDatabaseHas('items', [
        'id' => $itemId,
        'quantity' => 12,
    ]);

    // Second delivery: receive the remaining 3 units.
    $secondReceipt = $this->postJson('/api/goods-receipts', [
        'purchase_request_id' => \DB::table('purchase_request_items')
            ->where('id', $purchaseRequestItemId)
            ->value('purchase_request_id'),
        'notes' => 'Second partial delivery',
        'items' => [
            [
                'purchase_request_item_id' => $purchaseRequestItemId,
                'quantity_received' => 3,
            ],
        ],
    ]);

    $secondReceipt->assertCreated();

    $this->assertDatabaseHas('items', [
        'id' => $itemId,
        'quantity' => 15,
    ]);

    // Third delivery: this would exceed the requested quantity.
    $excessReceipt = $this->postJson('/api/goods-receipts', [
        'purchase_request_id' => \DB::table('purchase_request_items')
            ->where('id', $purchaseRequestItemId)
            ->value('purchase_request_id'),
        'notes' => 'Excess delivery',
        'items' => [
            [
                'purchase_request_item_id' => $purchaseRequestItemId,
                'quantity_received' => 1,
            ],
        ],
    ]);

    $excessReceipt->assertUnprocessable();

    // The rejected receipt must not change inventory or create records.
    $this->assertDatabaseHas('items', [
        'id' => $itemId,
        'quantity' => 15,
    ]);

    $this->assertDatabaseCount('goods_receipts', 2);
    $this->assertDatabaseCount('goods_receipt_items', 2);

    $this->assertDatabaseCount('inventory_movements', 2);
}
    public function test_receipt_exceeding_requested_quantity_is_rejected(): void
{
    $supplierId = $this->createSupplier();
    $itemId = $this->createItem();

    $purchaseRequestItemId =
        $this->createApprovedPurchaseRequestWithItem(
            $supplierId,
            $itemId,
            5,
            'PR-EXCESS-001'
        );

    $purchaseRequestId = \DB::table('purchase_request_items')
        ->where('id', $purchaseRequestItemId)
        ->value('purchase_request_id');

    $response = $this->postJson('/api/goods-receipts', [
        'purchase_request_id' => $purchaseRequestId,
        'notes' => 'Delivery exceeds requested quantity',
        'items' => [
            [
                'purchase_request_item_id' => $purchaseRequestItemId,
                'quantity_received' => 6,
            ],
        ],
    ]);

    $response->assertUnprocessable();

    // Inventory must remain unchanged.
    $this->assertDatabaseHas('items', [
        'id' => $itemId,
        'quantity' => 10,
    ]);

    // No partial records should survive the rejected transaction.
    $this->assertDatabaseCount('goods_receipts', 0);
    $this->assertDatabaseCount('goods_receipt_items', 0);
    $this->assertDatabaseCount('inventory_movements', 0);
}
    public function test_goods_receipt_is_rejected_for_unapproved_purchase_request(): void
{
    $supplierId = $this->createSupplier();
    $itemId = $this->createItem();

    $purchaseRequestItemId =
        $this->createApprovedPurchaseRequestWithItem(
            $supplierId,
            $itemId,
            5,
            'PR-UNAPPROVED-001'
        );

    $purchaseRequestId = \DB::table('purchase_request_items')
        ->where('id', $purchaseRequestItemId)
        ->value('purchase_request_id');

    \DB::table('purchase_requests')
        ->where('id', $purchaseRequestId)
        ->update([
            'status' => 'pending',
            'updated_at' => now(),
        ]);

    $response = $this->postJson('/api/goods-receipts', [
        'purchase_request_id' => $purchaseRequestId,
        'notes' => 'Receipt for a pending request',
        'items' => [
            [
                'purchase_request_item_id' => $purchaseRequestItemId,
                'quantity_received' => 2,
            ],
        ],
    ]);

    $response->assertUnprocessable();

    $this->assertDatabaseHas('items', [
        'id' => $itemId,
        'quantity' => 10,
    ]);

    $this->assertDatabaseCount('goods_receipts', 0);
    $this->assertDatabaseCount('goods_receipt_items', 0);
    $this->assertDatabaseCount('inventory_movements', 0);
}
}
