<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links concrete `rooms` rows back to the Room Inventory location that
 * generated them, so inventory-built rooms flow through Housekeeping,
 * Room Utilization, Dashboard, and Reports (all of which read `rooms`).
 *
 * Additive + nullable: existing rooms are untouched (link stays null).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->foreignId('room_inventory_location_id')
                ->nullable()
                ->after('dorm')
                ->constrained('room_inventory_locations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropConstrainedForeignId('room_inventory_location_id');
        });
    }
};
