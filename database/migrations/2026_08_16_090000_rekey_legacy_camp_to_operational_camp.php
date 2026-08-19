<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The staging dump ships a `camps` table left over from an older tenant — a
 * single row, id 2 — while every operational row (users, bookings, schedules,
 * reports) is keyed to camp 28. Inventory is partitioned by camp_id and
 * RoomInventoryController::campId() aborts with 403 when the signed-in user's
 * camp is absent from `camps`, so /room-inventory breaks until the two agree.
 *
 * Re-keying the legacy row to the operational id is deliberate: inserting a new
 * camp 28 instead would leave the existing inventory locations attached to
 * camp 2, i.e. invisible to the users who own them.
 *
 * Idempotent, because every staging import wipes it and it is re-applied by
 * SyncStagingDatabaseCommand.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('camps') || ! Schema::hasTable('users')) {
            return;
        }

        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        // The camp the application actually runs as: the one most users belong to.
        $operational = DB::table('users')
            ->whereNotNull('camp_id')
            ->where('camp_id', '>', 0)
            ->selectRaw('camp_id, COUNT(*) as total')
            ->groupBy('camp_id')
            ->orderByDesc('total')
            ->first();

        if (! $operational) {
            return;
        }

        $targetId = (int) $operational->camp_id;

        // Already consistent — normal case on a healthy database.
        if (DB::table('camps')->where('id', $targetId)->exists()) {
            return;
        }

        $legacyIds = DB::table('camps')->pluck('id');

        if ($legacyIds->count() !== 1) {
            // With zero or several camps there is no single row to re-key, and
            // guessing risks merging unrelated tenants. Fail loudly so the sync
            // reports it rather than leaving /room-inventory quietly broken.
            throw new RuntimeException(sprintf(
                'Cannot reconcile camps: users reference camp #%d, which is missing from `camps`, '
                .'and `camps` holds %d rows so there is no unambiguous row to re-key. Resolve manually.',
                $targetId,
                $legacyIds->count()
            ));
        }

        $legacyId = (int) $legacyIds->first();

        // FK-bound children (dorms, rooms, room_inventory_out_of_service, ...) are
        // ON UPDATE CASCADE, so they follow this automatically.
        DB::table('camps')->where('id', $legacyId)->update(['id' => $targetId]);

        // Tables carrying camp_id without an FK do not cascade. Left behind they
        // would point at an id that no longer exists in `camps` — the same class
        // of inconsistency this migration exists to fix.
        foreach ($this->campIdTables() as $table) {
            DB::table($table)->where('camp_id', $legacyId)->update(['camp_id' => $targetId]);
        }
    }

    public function down(): void
    {
        // Intentionally empty — re-keying back would re-break /room-inventory.
    }

    /**
     * Every table in the current schema with a `camp_id` column.
     *
     * @return list<string>
     */
    private function campIdTables(): array
    {
        $rows = DB::select("
            SELECT TABLE_NAME AS name
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'camp_id'
        ");

        return array_map(static fn ($row) => $row->name, $rows);
    }
};
