<?php

namespace Tests\Feature;

use App\Models\Item;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ItemImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_creates_new_item_with_zero_stock(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer test-import-token')
    ->postJson('/api/items/import', [
            'rows' => [
                [
                    'sku' => 'SKU-ETL-001',
                    'name' => 'Imported Keyboard',
                    'quantity' => 25,
                    'reorder_level' => 5,
                    'unit_price' => 500,
                    'unit' => 'piece',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('total_rows', 1)
            ->assertJsonPath('imported', 1)
            ->assertJsonPath('conflicts', 0)
            ->assertJsonPath('results.0.status', 'imported');

        $this->assertDatabaseHas('items', [
            'sku' => 'SKU-ETL-001',
            'name' => 'Imported Keyboard',
            'quantity' => 0,
            'reorder_level' => 5,
            'unit' => 'piece',
        ]);

        $item = Item::where('sku', 'SKU-ETL-001')->firstOrFail();

        $this->assertEquals('500.00', $item->unit_price);
    }

    public function test_import_reports_existing_sku_without_changing_item(): void
    {
        $item = Item::create([
            'sku' => 'SKU-ETL-002',
            'name' => 'Original Keyboard',
            'quantity' => 7,
            'reorder_level' => 3,
            'unit_price' => 450,
            'unit' => 'piece',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer test-import-token')
    ->postJson('/api/items/import', [
            'rows' => [
                [
                    'sku' => 'SKU-ETL-002',
                    'name' => 'Replacement Keyboard',
                    'quantity' => 99,
                    'unit_price' => 900,
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('imported', 0)
            ->assertJsonPath('conflicts', 1)
            ->assertJsonPath('results.0.status', 'conflict');

        $this->assertDatabaseHas('items', [
            'id' => $item->id,
            'sku' => 'SKU-ETL-002',
            'name' => 'Original Keyboard',
            'quantity' => 7,
        ]);

        $this->assertDatabaseCount('items', 1);
    }

    public function test_duplicate_skus_in_same_batch_are_reported_as_conflicts(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer test-import-token')
    ->postJson('/api/items/import', [
            'rows' => [
                [
                    'sku' => 'SKU-ETL-003',
                    'name' => 'First Item',
                    'quantity' => 10,
                ],
                [
                    'sku' => 'SKU-ETL-003',
                    'name' => 'Duplicate Item',
                    'quantity' => 20,
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('total_rows', 2)
            ->assertJsonPath('imported', 1)
            ->assertJsonPath('conflicts', 1)
            ->assertJsonPath('results.0.status', 'imported')
            ->assertJsonPath('results.1.status', 'conflict');

        $this->assertDatabaseCount('items', 1);

        $this->assertDatabaseHas('items', [
            'sku' => 'SKU-ETL-003',
            'name' => 'First Item',
            'quantity' => 0,
        ]);
    }

    public function test_import_rejects_rows_missing_required_fields(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer test-import-token')
    ->postJson('/api/items/import', [
            'rows' => [
                [
                    'sku' => 'SKU-ETL-004',
                    'quantity' => 10,
                ],
            ],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['rows.0.name']);

        $this->assertDatabaseCount('items', 0);
    }

    public function test_import_uses_defaults_for_optional_fields(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer test-import-token')
    ->postJson('/api/items/import', [
            'rows' => [
                [
                    'sku' => 'SKU-ETL-005',
                    'name' => 'Default Values Item',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('imported', 1);

        $this->assertDatabaseHas('items', [
            'sku' => 'SKU-ETL-005',
            'quantity' => 0,
            'reorder_level' => 10,
            'unit_price' => '0.00',
            'unit' => 'piece',
        ]);
    }
    public function test_import_rejects_blank_sku(): void
        {
            $response = $this->withHeader('Authorization', 'Bearer test-import-token')
    ->postJson('/api/items/import', [
                'rows' => [
                    [
                        'sku' => '   ',
                        'name' => 'Invalid Item',
                    ],
                ],
            ]);

            $response->assertUnprocessable()
                ->assertJsonValidationErrors(['rows.0.sku']);

            $this->assertDatabaseCount('items', 0);
        }
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.etl_import.token' => 'test-import-token',
        ]);
    }
    public function test_import_rejects_missing_token(): void
{
    $response = $this->postJson('/api/items/import', [
        'rows' => [],
    ]);

    $response->assertUnauthorized();
}

public function test_import_rejects_invalid_token(): void
{
    $response = $this
        ->withHeader('Authorization', 'Bearer wrong-token')
        ->postJson('/api/items/import', [
            'rows' => [],
        ]);

    $response->assertUnauthorized();
}
}

