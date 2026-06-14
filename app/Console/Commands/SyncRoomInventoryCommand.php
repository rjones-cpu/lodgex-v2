<?php

namespace App\Console\Commands;

use App\Models\RoomInventoryLocation;
use App\Services\RoomInventory\RoomInventorySyncService;
use Illuminate\Console\Command;

/**
 * Materializes every Room Inventory location into concrete `rooms` rows.
 *
 * Useful for backfilling locations that were created before sync existed, or
 * for reconciling after bulk data changes. Safe to run repeatedly.
 */
class SyncRoomInventoryCommand extends Command
{
    protected $signature = 'room-inventory:sync';

    protected $description = 'Sync Room Inventory locations into the rooms table (materialize + reconcile)';

    public function handle(RoomInventorySyncService $sync): int
    {
        $locations = RoomInventoryLocation::query()->orderBy('sort_order')->orderBy('id')->get();

        if ($locations->isEmpty()) {
            $this->info('No Room Inventory locations to sync.');

            return self::SUCCESS;
        }

        foreach ($locations as $location) {
            $sync->syncLocation($location);
            $this->line("Synced: {$location->name} ({$location->total_rooms} rooms)");
        }

        $this->info("Done. Synced {$locations->count()} location(s).");

        return self::SUCCESS;
    }
}
