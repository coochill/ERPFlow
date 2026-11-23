<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_returns_empty_values(): void
    {
        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.inventory.total_items', 0)
            ->assertJsonPath('data.inventory.total_stock_quantity', 0)
            ->assertJsonPath('data.inventory.low_stock_items', 0)
            ->assertJsonPath('data.inventory.out_of_stock_items', 0)
            ->assertJsonPath('data.procurement.total_suppliers', 0)
            ->assertJsonPath('data.procurement.pending_receiving', 0)
            ->assertJsonPath('data.recent_activities', []);
    }

    public function test_dashboard_calculates_inventory_and_procurement_metrics(): void
    {
        DB::table('suppliers')->insert([
            [
                'name' => 'Primary Supplier',
                'contact_name' => 'Supplier Contact',
                'email' => 'primary@example.test',
                'phone' => '09170000001',
                'address' => 'Test Address',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
        $supplierId = DB::table('suppliers')->value('id');

        DB::table('items')->insert([
            [
                'sku' => 'DASH-IN',
                'name' => 'In Stock Item',
                'quantity' => 10,
                'reorder_level' => 5,
                'unit_price' => 100,
                'unit' => 'piece',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sku' => 'DASH-LOW',
                'name' => 'Low Stock Item',
                'quantity' => 3,
                'reorder_level' => 5,
                'unit_price' => 100,
                'unit' => 'piece',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sku' => 'DASH-OUT',
                'name' => 'Out of Stock Item',
                'quantity' => 0,
                'reorder_level' => 5,
                'unit_price' => 100,
                'unit' => 'piece',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $inItemId = DB::table('items')->where('sku', 'DASH-IN')->value('id');
        $partialRequestId = DB::table('purchase_requests')->insertGetId([
            'request_number' => 'PR-DASH-PARTIAL',
            'supplier_id' => $supplierId,
            'status' => 'approved',
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $partialRequestItemId = DB::table('purchase_request_items')->insertGetId([
            'purchase_request_id' => $partialRequestId,
            'item_id' => $inItemId,
            'quantity' => 5,
            'unit_price' => 100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $receiptId = DB::table('goods_receipts')->insertGetId([
            'receipt_number' => 'GR-DASH-PARTIAL',
            'purchase_request_id' => $partialRequestId,
            'supplier_id' => $supplierId,
            'received_by' => null,
            'received_at' => now(),
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('goods_receipt_items')->insert([
            'goods_receipt_id' => $receiptId,
            'purchase_request_item_id' => $partialRequestItemId,
            'quantity_received' => 2,
            'unit_price' => 100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('purchase_requests')->insert([
            [
                'request_number' => 'PR-DASH-PENDING',
                'supplier_id' => $supplierId,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'request_number' => 'PR-DASH-DRAFT',
                'supplier_id' => $supplierId,
                'status' => 'draft',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'request_number' => 'PR-DASH-REJECTED',
                'supplier_id' => $supplierId,
                'status' => 'rejected',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        DB::table('inventory_movements')->insert([
            'item_id' => $inItemId,
            'goods_receipt_id' => $receiptId,
            'type' => 'in',
            'quantity' => 2,
            'reason' => 'Dashboard test movement',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.inventory.total_items', 3)
            ->assertJsonPath('data.inventory.total_stock_quantity', 13)
            ->assertJsonPath('data.inventory.low_stock_items', 1)
            ->assertJsonPath('data.inventory.out_of_stock_items', 1)
            ->assertJsonPath('data.inventory.stock_status.in_stock', 1)
            ->assertJsonPath('data.inventory.stock_status.low_stock', 1)
            ->assertJsonPath('data.inventory.stock_status.out_of_stock', 1)
            ->assertJsonPath('data.procurement.total_suppliers', 1)
            ->assertJsonPath('data.procurement.pending_requests', 1)
            ->assertJsonPath('data.procurement.approved_requests', 1)
            ->assertJsonPath('data.procurement.pending_receiving', 1)
            ->assertJsonCount(4, 'data.procurement.request_status_breakdown')
            ->assertJsonFragment(['status' => 'approved', 'count' => 1])
            ->assertJsonFragment(['status' => 'pending', 'count' => 1]);
    }
}
