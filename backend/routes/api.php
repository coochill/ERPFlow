<?php

use App\Http\Controllers\ItemController;
use App\Http\Controllers\InventoryMovementController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PurchaseRequestController;
use App\Http\Controllers\GoodsReceiptController;
use App\Http\Middleware\EnsureEtlImportToken;



Route::post('/items/import', [ItemController::class, 'import']);
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
Route::get(
    '/goods-receipts',
    [GoodsReceiptController::class, 'index']
);

Route::post(
    '/goods-receipts',
    [GoodsReceiptController::class, 'store']
);

Route::get(
    '/goods-receipts/{goodsReceipt}',
    [GoodsReceiptController::class, 'show']
);
Route::post('/items/import', [ItemController::class, 'import'])
    ->middleware(EnsureEtlImportToken::class);
