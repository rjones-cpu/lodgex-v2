<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fresh sqlite / greenfield installs never received the live-DB rename that
 * left LodgeX rooms in `rooms_old`. The Room model already reads that table.
 * Also add users.camp_id when missing so BelongsToCamp and inventory tests
 * can partition like camp-reservations.
 *
 * MySQL live DBs that already have these objects are unchanged.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'camp_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('camp_id')->nullable()->after('id');
                $table->index('camp_id');
            });
        }

        if (! Schema::hasTable('rooms_old')) {
            Schema::create('rooms_old', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('user_id')->nullable();
                $table->string('number', 20);
                $table->string('dorm');
                $table->foreignId('room_inventory_location_id')
                    ->nullable()
                    ->constrained('room_inventory_locations')
                    ->nullOnDelete();
                $table->string('room_type', 50);
                $table->string('status', 50);
                $table->unsignedBigInteger('current_worker_id')->nullable();
                $table->string('company')->nullable();
                $table->unsignedSmallInteger('hold_days')->default(0);
                $table->timestamp('status_updated_at')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['number', 'dorm']);
                $table->index('status');
                $table->index('dorm');
            });
        }
    }

    public function down(): void
    {
        // Do not drop rooms_old or camp_id — live LodgeX / camp-reservations
        // partitions depend on them.
    }
};
