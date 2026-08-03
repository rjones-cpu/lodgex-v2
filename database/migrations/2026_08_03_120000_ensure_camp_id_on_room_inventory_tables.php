<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ensure room inventory tables carry `camp_id` (shared with camp-reservations).
 * Fresh LodgeX installs created these tables without camp_id; live/shared DBs
 * already have the column — this migration is idempotent either way.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('room_inventory_locations')
            && ! Schema::hasColumn('room_inventory_locations', 'camp_id')) {
            Schema::table('room_inventory_locations', function (Blueprint $table) {
                $table->unsignedBigInteger('camp_id')->default(0)->after('id');
                $table->index('camp_id');
            });
        }

        if (Schema::hasTable('room_inventory_out_of_service')
            && ! Schema::hasColumn('room_inventory_out_of_service', 'camp_id')) {
            Schema::table('room_inventory_out_of_service', function (Blueprint $table) {
                $table->unsignedBigInteger('camp_id')->default(0)->after('id');
                $table->index('camp_id');
            });
        }
    }

    public function down(): void
    {
        // Do not drop camp_id — shared camp-reservations schema depends on it.
    }
};
