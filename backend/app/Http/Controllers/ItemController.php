<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class ItemController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Item::query()->orderBy('name')->paginate(15)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sku' => ['required', 'string', 'max:50', 'unique:items,sku'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'quantity' => ['sometimes', 'integer', 'min:0'],
            'reorder_level' => ['sometimes', 'integer', 'min:0'],
            'unit_price' => ['sometimes', 'numeric', 'min:0'],
            'unit' => ['sometimes', 'string', 'max:20'],
        ]);

        $item = Item::create($validated);

        return response()->json($item, 201);
    }

    public function show(Item $item): JsonResponse
    {
        return response()->json($item);
    }

    public function update(Request $request, Item $item): JsonResponse
    {
        $validated = $request->validate([
            'sku' => [
                'sometimes', 'required', 'string', 'max:50',
                Rule::unique('items', 'sku')->ignore($item->id),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'quantity' => ['sometimes', 'integer', 'min:0'],
            'reorder_level' => ['sometimes', 'integer', 'min:0'],
            'unit_price' => ['sometimes', 'numeric', 'min:0'],
            'unit' => ['sometimes', 'string', 'max:20'],
        ]);

        $item->update($validated);

        return response()->json($item->refresh());
    }

    public function destroy(Item $item): JsonResponse
    {
        $item->delete();

        return response()->json(null, 204);
    }
public function import(Request $request): JsonResponse
{
    $validated = $request->validate([
        'rows' => ['required', 'array', 'min:1', 'max:500'],
        'rows.*.sku' => ['required', 'string', 'max:50', 'regex:/\S/'],
        'rows.*.name' => ['required', 'string', 'max:255'],
        'rows.*.description' => ['nullable', 'string'],
        'rows.*.quantity' => ['sometimes', 'integer', 'min:0'],
        'rows.*.reorder_level' => ['sometimes', 'integer', 'min:0'],
        'rows.*.unit_price' => ['sometimes', 'numeric', 'min:0'],
        'rows.*.unit' => ['sometimes', 'string', 'max:20'],
    ]);

    $results = [];

    foreach ($validated['rows'] as $row) {
        $sku = strtoupper(trim($row['sku']));

        $result = DB::transaction(function () use ($row, $sku) {
            $existingItem = Item::query()
                ->where('sku', $sku)
                ->first();

            if ($existingItem) {
                return [
                    'sku' => $sku,
                    'status' => 'conflict',
                    'message' => 'SKU already exists; existing item was not changed.',
                ];
            }

            $item = Item::create([
                'sku' => $sku,
                'name' => trim($row['name']),
                'description' => $row['description'] ?? null,
                'quantity' => 0,
                'reorder_level' => $row['reorder_level'] ?? 10,
                'unit_price' => $row['unit_price'] ?? 0,
                'unit' => $row['unit'] ?? 'piece',
            ]);

            return [
                'sku' => $sku,
                'status' => 'imported',
                'item_id' => $item->id,
                'message' => 'Item created with zero stock.',
            ];
        });

        $results[] = $result;
    }

    $imported = count(array_filter(
        $results,
        fn (array $result) => $result['status'] === 'imported'
    ));

    $conflicts = count(array_filter(
        $results,
        fn (array $result) => $result['status'] === 'conflict'
    ));

    return response()->json([
        'total_rows' => count($results),
        'imported' => $imported,
        'conflicts' => $conflicts,
        'results' => $results,
    ]);
}

}
