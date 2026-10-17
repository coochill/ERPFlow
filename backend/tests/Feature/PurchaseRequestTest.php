<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\PurchaseRequest;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseRequestTest extends TestCase
{
    use RefreshDatabase;

    private function createSupplier(): Supplier
    {
        return Supplier::create([
            'name' => 'Test Supplier',
            'email' => 'supplier@test.local',
            'status' => 'active',
        ]);
    }

    private function createItem(): Item
    {
        return Item::create([
            'sku' => 'TEST-001',
            'name' => 'Test Keyboard',
            'description' => 'Test inventory item',
            'quantity' => 10,
            'reorder_level' => 2,
            'unit_price' => 500.00,
            'unit' => 'piece',
        ]);
    }

    private function validPayload(
        Supplier $supplier,
        Item $item
    ): array {
        return [
            'supplier_id' => $supplier->id,
            'notes' => 'Test purchase request',
            'items' => [
                [
                    'item_id' => $item->id,
                    'quantity' => 3,
                    'unit_price' => 500.00,
                ],
            ],
        ];
    }

    public function test_purchase_request_can_be_created(): void
    {
        $supplier = $this->createSupplier();
        $item = $this->createItem();

        $response = $this->postJson(
            '/api/purchase-requests',
            $this->validPayload($supplier, $item)
        );

        $response->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.supplier.id', $supplier->id)
            ->assertJsonPath('data.items.0.quantity', 3);

        $this->assertDatabaseCount('purchase_requests', 1);
        $this->assertDatabaseCount('purchase_request_items', 1);
    }

    public function test_purchase_request_requires_valid_items(): void
    {
        $supplier = $this->createSupplier();
        $item = $this->createItem();

        $payload = $this->validPayload($supplier, $item);
        $payload['items'][0]['quantity'] = 0;

        $this->postJson('/api/purchase-requests', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items.0.quantity');

        $this->assertDatabaseCount('purchase_requests', 0);
    }

    public function test_purchase_request_follows_valid_status_transitions(): void
    {
        $supplier = $this->createSupplier();
        $item = $this->createItem();

        $response = $this->postJson(
            '/api/purchase-requests',
            $this->validPayload($supplier, $item)
        )->assertCreated();

        $requestId = $response->json('data.id');

        $this->patchJson(
            "/api/purchase-requests/{$requestId}/status",
            ['status' => 'pending']
        )->assertOk()
            ->assertJsonPath('data.status', 'pending');

        $this->patchJson(
            "/api/purchase-requests/{$requestId}/status",
            ['status' => 'approved']
        )->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->patchJson(
            "/api/purchase-requests/{$requestId}/status",
            ['status' => 'rejected']
        )->assertUnprocessable();

        $this->assertDatabaseHas('purchase_requests', [
            'id' => $requestId,
            'status' => 'approved',
        ]);
    }

    public function test_approving_request_does_not_change_inventory_stock(): void
    {
        $supplier = $this->createSupplier();
        $item = $this->createItem();

        $response = $this->postJson(
            '/api/purchase-requests',
            $this->validPayload($supplier, $item)
        )->assertCreated();

        $requestId = $response->json('data.id');

        $this->patchJson(
            "/api/purchase-requests/{$requestId}/status",
            ['status' => 'pending']
        )->assertOk();

        $this->patchJson(
            "/api/purchase-requests/{$requestId}/status",
            ['status' => 'approved']
        )->assertOk();

        $this->assertDatabaseHas('items', [
            'id' => $item->id,
            'quantity' => 10,
        ]);
    }
}