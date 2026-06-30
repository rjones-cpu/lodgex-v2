<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets the Accommodation Workforce schedule mirror its housekeeper roster into the
 * local `housekeepers` table without creating duplicates on repeat syncs.
 *
 * Each rostered housekeeper is keyed by an external ref (per owner) so the same
 * person is matched rather than re-created even when their name spelling changes.
 * Mirrors the external-sync columns already on `workers`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('housekeepers', function (Blueprint $table) {
            if (! Schema::hasColumn('housekeepers', 'external_source')) {
                $table->string('external_source', 50)->nullable()->after('is_active');
            }
            if (! Schema::hasColumn('housekeepers', 'external_ref')) {
                $table->string('external_ref', 100)->nullable()->after('external_source');

                $columns = Schema::hasColumn('housekeepers', 'user_id')
                    ? ['user_id', 'external_source', 'external_ref']
                    : ['external_source', 'external_ref'];

                $table->index($columns, 'housekeepers_external_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('housekeepers', function (Blueprint $table) {
            if (Schema::hasColumn('housekeepers', 'external_ref')) {
                $table->dropIndex('housekeepers_external_idx');
                $table->dropColumn('external_ref');
            }
            if (Schema::hasColumn('housekeepers', 'external_source')) {
                $table->dropColumn('external_source');
            }
        });
    }
};
