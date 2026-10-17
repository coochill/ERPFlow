<?php

namespace App\Http\Controllers;

use App\Models\InventoryMovement;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InventoryMovementController extends Controller
{
    public function store(Request $request, Item $item): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['in', 'out'])],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $movement = DB::transaction(function () use ($item, $validated) {
            $lockedItem = Item::whereKey($item->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $validated['type'] === 'out'
                && $lockedItem->quantity < $validated['quantity']
            ) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'quantity' => 'Insufficient stock available.',
                ]);
            }

            if ($validated['type'] === 'in') {
                $lockedItem->increment('quantity', $validated['quantity']);
            } else {
                $lockedItem->decrement('quantity', $validated['quantity']);
            }

            return InventoryMovement::create([
                'item_id' => $lockedItem->id,
                'type' => $validated['type'],
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'],
            ]);
        });

        return response()->json([
            'message' => 'Inventory movement recorded successfully.',
            'movement' => $movement,
            'item' => $item->fresh(),
        ], 201);
    }
    
    public function history(Item $item): JsonResponse
    {
        $movements = $item->inventoryMovements()
            ->latest()
            ->paginate(10);

        return response()->json($movements);
    }

}
