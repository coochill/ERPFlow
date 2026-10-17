<?php

use App\Http\Controllers\ItemController;
use App\Http\Controllers\InventoryMovementController;
use Illuminate\Support\Facades\Route;

Route::apiResource('items', ItemController::class);
Route::post(
    '/items/{item}/movements',
    [InventoryMovementController::class, 'store']
);
Route::get(
    '/items/{item}/movements',
    [InventoryMovementController::class, 'history']
);