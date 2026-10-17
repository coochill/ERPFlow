<?php

use App\Http\Controllers\ItemController;
use App\Http\Controllers\InventoryMovementController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SupplierController;

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