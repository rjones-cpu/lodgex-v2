<?php

namespace Database\Seeders;

use App\Models\RoomInventoryLocation;
use App\Services\RoomInventory\RoomInventorySyncService;
use Illuminate\Database\Seeder;

/**
 * Seeds the camp's Room Inventory locations and materializes their rooms into
 * the `rooms` table (via the sync service) so every downstream module
 * (Housekeeping, Room Utilization, Dashboard, Reports) sees inventory-built
 * rooms automatically.
 *
 * This is the single source of truth for the room set: a fresh
 * `migrate:fresh --seed` produces 408 rooms entirely from this inventory, with
 * no legacy demo rooms. RoomUtilizationSeeder then layers demo activity on top
 * of these rooms rather than creating its own.
 *
 * Idempotent: skips entirely if any inventory location already exists, so it
 * never duplicates rooms or clobbers user-created inventory.
 */
class RoomInventorySeeder extends Seeder
{
    public function run(): void
    {
        if (RoomInventoryLocation::query()->exists()) {
            return;
        }

        $sync = app(RoomInventorySyncService::class);

        // name, type, total, exec, senior_exec, wellsite (408 rooms total).
        $locations = [
            ['A', 'dorm', 22, 0, 22, 0],
            ['B', 'dorm', 22, 0, 22, 0],
            ['E', 'dorm', 30, 30, 0, 0],
            ['F', 'dorm', 30, 30, 0, 0],
            ['G', 'dorm', 30, 30, 0, 0],
            ['H', 'dorm', 30, 30, 0, 0],
            ['I', 'dorm', 30, 30, 0, 0],
            ['J', 'dorm', 30, 30, 0, 0],
            ['K', 'dorm', 30, 30, 0, 0],
            ['L', 'dorm', 30, 30, 0, 0],
            ['M', 'dorm', 30, 30, 0, 0],
            ['N', 'dorm', 30, 30, 0, 0],
            ['O', 'dorm', 30, 30, 0, 0],
            ['P', 'dorm', 30, 30, 0, 0],
            ['Wellsite 1', 'wellsite', 2, 0, 0, 2],
            ['Wellsite 2', 'wellsite', 2, 0, 0, 2],
        ];

        foreach ($locations as $index => [$name, $type, $total, $exec, $senior, $well]) {
            $location = RoomInventoryLocation::create([
                'name' => $name,
                'location_type' => $type,
                'total_rooms' => $total,
                'rooms_executive' => $exec,
                'rooms_senior_executive' => $senior,
                'rooms_wellsite' => $well,
                'sort_order' => $index + 1,
            ]);

            $sync->syncLocation($location);
        }
    }
}
