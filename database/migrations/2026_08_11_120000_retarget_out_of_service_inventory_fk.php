<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Same drift as `rooms_old` (see 2026_08_03_210000): live/shared DBs still FK
 * `room_inventory_out_of_service.room_inventory_location_id` to the legacy
 * `room_inventory_locations_old` table, while LodgeX writes locations into
 * `room_inventory_locations`. Marking a room out of service fails the FK until
 * this is retargeted.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('room_inventory_out_of_service')
            || ! Schema::hasTable('room_inventory_locations')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        // Orphans would block the new constraint; the column is nullable with
        // ON DELETE SET NULL, so detaching them is the correct treatment.
        DB::statement('
            UPDATE room_inventory_out_of_service o
            LEFT JOIN room_inventory_locations l ON l.id = o.room_inventory_location_id
            SET o.room_inventory_location_id = NULL
            WHERE o.room_inventory_location_id IS NOT NULL AND l.id IS NULL
        ');

        $fk = DB::selectOne("
            SELECT CONSTRAINT_NAME AS name
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'room_inventory_out_of_service'
              AND COLUMN_NAME = 'room_inventory_location_id'
              AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1
        ");

        if ($fk && ! empty($fk->name)) {
            DB::statement("ALTER TABLE room_inventory_out_of_service DROP FOREIGN KEY `{$fk->name}`");
        }

        DB::statement('
            ALTER TABLE room_inventory_out_of_service
            ADD CONSTRAINT room_inventory_out_of_service_location_id_foreign
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
