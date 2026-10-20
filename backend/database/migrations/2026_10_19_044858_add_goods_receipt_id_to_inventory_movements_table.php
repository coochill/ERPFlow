<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */

public function up(): void
{
    Schema::table('inventory_movements', function (Blueprint $table) {
        $table->foreignId('goods_receipt_id')
            ->nullable()
            ->after('item_id')
            ->constrained('goods_receipts')
            ->restrictOnDelete();
    });
}

public function down(): void
{
    Schema::table('inventory_movements', function (Blueprint $table) {
        $table->dropConstrainedForeignId('goods_receipt_id');
    });
}

};
