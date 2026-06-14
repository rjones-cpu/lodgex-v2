<?php

namespace App\Console\Commands;

use App\Models\ReleaseCandidate;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Removes legacy "demo" rooms that were NOT built through Room Inventory
 * (room_inventory_location_id IS NULL), so the system reflects only the rooms
 * defined in Room Inventory.
 *
 * Cascade deletes handle room-scoped records (holds, maintenance holds,
 * housekeeping tasks, hk work tasks, inspections). Reservations and release
 * candidates use nullOnDelete, so they are removed explicitly to avoid leaving
 * orphaned demo records.
 */
class PruneLegacyRoomsCommand extends Command
{
    protected $signature = 'rooms:prune-legacy {--force : Skip the confirmation prompt}';

    protected $description = 'Delete legacy rooms not linked to a Room Inventory location (and their orphaned demo data)';

    public function handle(): int
    {
        $legacyIds = Room::query()->whereNull('room_inventory_location_id')->pluck('id');

        if ($legacyIds->isEmpty()) {
            $this->info('No legacy rooms found — system already reflects Room Inventory only.');

            return self::SUCCESS;
        }

        $this->warn("Found {$legacyIds->count()} legacy room(s) not linked to Room Inventory.");

        if (! $this->option('force') && ! $this->confirm('Delete these rooms and their orphaned demo data?')) {
            $this->line('Aborted.');

            return self::SUCCESS;
        }

        $deleted = DB::transaction(function () use ($legacyIds) {
            $res = Reservation::query()->whereIn('room_id', $legacyIds)->delete();
            $rc = ReleaseCandidate::query()->whereIn('room_id', $legacyIds)->delete();
            $rooms = Room::query()->whereIn('id', $legacyIds)->delete();

            return compact('res', 'rc', 'rooms');
        });

        $this->info("Deleted {$deleted['rooms']} room(s), {$deleted['res']} reservation(s), {$deleted['rc']} release candidate(s).");
        $this->info('Active rooms now: '.Room::query()->active()->count().' (all from Room Inventory).');

        return self::SUCCESS;
    }
}
