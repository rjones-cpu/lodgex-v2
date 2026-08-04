<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Live/shared DBs may still FK `rooms_old.room_inventory_location_id` to the
 * legacy `room_inventory_locations_old` table. LodgeX writes locations into
 * `room_inventory_locations`, so materializing rooms fails the FK and leaves
 * the dashboard with nothing to assign.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('rooms_old') || ! Schema::hasTable('room_inventory_locations')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        $fk = DB::selectOne("
            SELECT CONSTRAINT_NAME AS name
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'rooms_old'
              AND COLUMN_NAME = 'room_inventory_location_id'
              AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1
        ");

        if ($fk && ! empty($fk->name)) {
            DB::statement("ALTER TABLE rooms_old DROP FOREIGN KEY `{$fk->name}`");
        }

        DB::statement('
            ALTER TABLE rooms_old
            ADD CONSTRAINT rooms_old_room_inventory_location_id_foreign
            FOREIGN KEY (room_inventory_location_id)
            REFERENCES room_inventory_locations (id)
            ON DELETE SET NULL
        ');
    }

    public function down(): void
    {
        // Intentionally empty — do not retarget back to the legacy table.
    }
};
