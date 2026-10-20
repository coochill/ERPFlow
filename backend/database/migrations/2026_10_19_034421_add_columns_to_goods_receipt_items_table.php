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
            Schema::table('goods_receipt_items', function (Blueprint $table) {
                if (! Schema::hasColumn('goods_receipt_items', 'goods_receipt_id')) {
                    $table->foreignId('goods_receipt_id')
                        ->constrained('goods_receipts')
                        ->cascadeOnDelete();
                }

                if (! Schema::hasColumn('goods_receipt_items', 'purchase_request_item_id')) {
                    $table->foreignId('purchase_request_item_id')
                        ->constrained('purchase_request_items')
                        ->restrictOnDelete();
                }

                if (! Schema::hasColumn('goods_receipt_items', 'quantity_received')) {
                    $table->unsignedInteger('quantity_received');
                }

                if (! Schema::hasColumn('goods_receipt_items', 'unit_price')) {
                    $table->decimal('unit_price', 12, 2);
                }
            });

            Schema::table('goods_receipt_items', function (Blueprint $table) {
                $table->unique(
                    ['goods_receipt_id', 'purchase_request_item_id'],
                    'gr_items_receipt_request_unique'
                );
            });
        }

        public function down(): void
        {
            Schema::table('goods_receipt_items', function (Blueprint $table) {
                $table->dropUnique([
                    'goods_receipt_items_goods_receipt_id_purchase_request_item_id_unique',
                ]);

                $table->dropConstrainedForeignId('purchase_request_item_id');
                $table->dropConstrainedForeignId('goods_receipt_id');

                $table->dropColumn([
                    'quantity_received',
                    'unit_price',
                ]);
            });
        }
};
