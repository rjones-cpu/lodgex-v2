<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets the Accommodation Workforce schedule (camp-reservations) mirror its
 * bookings into the local Reservation Operations queue without creating
 * duplicates on repeat syncs.
 *
 * Each synced reservation is keyed by its camp-reservations booking id
 * (unique per owner), and each synced worker is keyed by an external ref so
 * the same person is matched rather than re-created.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workers', function (Blueprint $table) {
            if (! Schema::hasColumn('workers', 'external_source')) {
                $table->string('external_source', 50)->nullable()->after('gender');
            }
            if (! Schema::hasColumn('workers', 'external_ref')) {
                $table->string('external_ref', 100)->nullable()->after('external_source');
                $table->index(['user_id', 'external_source', 'external_ref'], 'workers_external_idx');
            }
        });

        Schema::table('reservations', function (Blueprint $table) {
            if (! Schema::hasColumn('reservations', 'external_source')) {
                $table->string('external_source', 50)->nullable()->after('ai_match_score');
            }
            if (! Schema::hasColumn('reservations', 'external_booking_id')) {
                $table->string('external_booking_id', 100)->nullable()->after('external_source');
                // One reservation per booking per owner; nulls are allowed for
                // locally-created reservations (MySQL permits multiple nulls).
                $table->unique(['user_id', 'external_booking_id'], 'reservations_owner_external_unique');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            if (Schema::hasColumn('reservations', 'external_booking_id')) {
                $table->dropUnique('reservations_owner_external_unique');
                $table->dropColumn('external_booking_id');
            }
            if (Schema::hasColumn('reservations', 'external_source')) {
                $table->dropColumn('external_source');
            }
        });

        Schema::table('workers', function (Blueprint $table) {
            if (Schema::hasColumn('workers', 'external_ref')) {
                $table->dropIndex('workers_external_idx');
                $table->dropColumn('external_ref');
            }
            if (Schema::hasColumn('workers', 'external_source')) {
                $table->dropColumn('external_source');
            }
        });
    }
};
