<?php

use App\Http\Controllers\ItemController;
use App\Http\Controllers\InventoryMovementController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PurchaseRequestController;

Route::apiResource('items', ItemController::class);
Route::post(
    '/items/{item}/movements',
    [InventoryMovementController::class, 'store']
);
Route::get(
    '/items/{item}/movements',
    [InventoryMovementController::class, 'history']
);
Route::apiResource('suppliers', SupplierController::class);
Route::patch(
    '/purchase-requests/{purchaseRequest}/status',
    [PurchaseRequestController::class, 'updateStatus']
);

Route::apiResource('purchase-requests', PurchaseRequestController::class);