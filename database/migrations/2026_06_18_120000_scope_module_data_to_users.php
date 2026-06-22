<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Per-user data isolation.
 *
 * Adds an owner `user_id` to every module data table so each logged-in user
 * only sees their own records (enforced at the model layer via the
 * App\Models\Concerns\BelongsToUser global scope).
 *
 * Static config tables (`hk_cleaning_standards`, `hk_workload_rules`) stay
 * global and are intentionally excluded.
 *
 * Existing single-tenant rows are backfilled to user id 2 so the current
 * dataset remains visible after scoping is switched on.
 */
return new class extends Migration
{
    /** Tables that gain a fresh owner column. */
    private array $newOwnerTables = [
        'workers',
        'rooms',
        'reservations',
        'room_holds',
        'contractor_allotments',
        'maintenance_holds',
        'housekeeping_tasks',
        'forecast_snapshots',
        'ai_recommendations',
        'release_candidates',
        'overflow_scenarios',
        'housekeepers',
        'hk_work_tasks',
        'hk_daily_assignments',
        'hk_inspections',
        'hk_forecasts',
        'hk_ai_recommendations',
        'hk_schedule_feeds',
        'room_inventory_locations',
        'room_inventory_out_of_service',
        'dorm_off_market_holds',
        'utilization_approval_requests',
    ];

    /** Audit tables that already carry a user_id (the actor) — backfill only. */
    private array $existingOwnerTables = [
        'hk_audit_logs',
        'utilization_audit_logs',
        'ai_recommendation_audit_logs',
    ];

    public function up(): void
    {
        foreach ($this->newOwnerTables as $table) {
            if (! Schema::hasColumn($table, 'user_id')) {
                Schema::table($table, function (Blueprint $t) {
                    // `users.id` is INT UNSIGNED on this (legacy) database, so the
                    // owner column must be the exact same type. Using foreignId()
                    // would create a BIGINT and break the FK with errno 150.
                    $t->unsignedInteger('user_id')
                        ->nullable()
                        ->after('id');
                    $t->foreign('user_id')
                        ->references('id')
                        ->on('users')
                        ->nullOnDelete();
                });
            }
        }

        // Backfill the existing single-tenant dataset to the designated owner so
        // it stays visible once per-user scoping is enforced.
        if (DB::table('users')->where('id', 2)->exists()) {
            foreach (array_merge($this->newOwnerTables, $this->existingOwnerTables) as $table) {
                DB::table($table)->whereNull('user_id')->update(['user_id' => 2]);
            }
        }

        // Re-scope unique constraints that would otherwise collide across users.
        $this->dropUniqueAndRescope('rooms', ['number', 'dorm'], ['user_id', 'number', 'dorm']);
        $this->dropUniqueAndRescope('forecast_snapshots', ['forecast_date'], ['user_id', 'forecast_date']);
        $this->dropUniqueAndRescope('hk_forecasts', ['forecast_date'], ['user_id', 'forecast_date']);
        $this->dropUniqueAndRescope('hk_work_tasks', ['fingerprint'], ['user_id', 'fingerprint']);
        $this->dropUniqueAndRescope('ai_recommendations', ['fingerprint'], ['user_id', 'fingerprint']);
        $this->dropUniqueAndRescope('hk_ai_recommendations', ['fingerprint'], ['user_id', 'fingerprint']);
        $this->dropUniqueAndRescope('utilization_approval_requests', ['fingerprint'], ['user_id', 'fingerprint']);
    }

    public function down(): void
    {
        // Restore the original (global) unique constraints.
        $this->dropUniqueAndRescope('rooms', ['user_id', 'number', 'dorm'], ['number', 'dorm']);
        $this->dropUniqueAndRescope('forecast_snapshots', ['user_id', 'forecast_date'], ['forecast_date']);
        $this->dropUniqueAndRescope('hk_forecasts', ['user_id', 'forecast_date'], ['forecast_date']);
        $this->dropUniqueAndRescope('hk_work_tasks', ['user_id', 'fingerprint'], ['fingerprint']);
        $this->dropUniqueAndRescope('ai_recommendations', ['user_id', 'fingerprint'], ['fingerprint']);
        $this->dropUniqueAndRescope('hk_ai_recommendations', ['user_id', 'fingerprint'], ['fingerprint']);
        $this->dropUniqueAndRescope('utilization_approval_requests', ['user_id', 'fingerprint'], ['fingerprint']);

        // Only drop the owner columns this migration added; leave the audit
        // tables' pre-existing user_id columns untouched.
        foreach ($this->newOwnerTables as $table) {
            if (Schema::hasColumn($table, 'user_id')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropConstrainedForeignId('user_id');
                });
            }
        }
    }

    /**
     * Drop one unique index and add another in a single ALTER.
     *
     * @param  list<string>  $drop
     * @param  list<string>  $add
     */
    private function dropUniqueAndRescope(string $table, array $drop, array $add): void
    {
        Schema::table($table, function (Blueprint $t) use ($drop, $add) {
            $t->dropUnique($drop);
            $t->unique($add);
        });
    }
};
