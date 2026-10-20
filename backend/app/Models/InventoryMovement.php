<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryMovement extends Model
{
    protected $fillable = [
    'item_id',
    'goods_receipt_id',
    'type',
    'quantity',
    'reason',
];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
    public function goodsReceipt(): BelongsTo
{
    return $this->belongsTo(GoodsReceipt::class);
}
}
