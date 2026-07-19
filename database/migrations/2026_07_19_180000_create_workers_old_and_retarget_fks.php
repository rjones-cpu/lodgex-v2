<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Camp-reservations already owns `workers`. LodgeX guest/worker rows for
 * Reservation Operations live in `workers_old` (same pattern as rooms_old).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('workers_old')) {
            Schema::create('workers_old', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('user_id')->nullable();
                $table->string('name');
                $table->string('company')->nullable();
                $table->string('project')->nullable();
                $table->string('gender')->nullable();
                $table->string('external_source', 50)->nullable();
                $table->string('external_ref', 100)->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
                $table->index(['user_id', 'external_source', 'external_ref'], 'workers_old_external_idx');
            });
        }

        // Point Reservation Operations FKs at workers_old instead of camp `workers`.
        $this->retargetForeignKey(
            'reservations',
            'reservations_worker_id_foreign',
            'worker_id',
            'workers_old',
            'cascade',
        );

        if (Schema::hasTable('rooms_old') && Schema::hasColumn('rooms_old', 'current_worker_id')) {
            $this->retargetForeignKey(
                'rooms_old',
                'rooms_old_current_worker_id_foreign',
                'current_worker_id',
                'workers_old',
                'set null',
            );
        }
    }

    public function down(): void
    {
        $this->retargetForeignKey(
            'reservations',
            'reservations_worker_id_foreign',
            'worker_id',
            'workers',
            'cascade',
        );

        if (Schema::hasTable('rooms_old') && Schema::hasColumn('rooms_old', 'current_worker_id')) {
            $this->retargetForeignKey(
                'rooms_old',
                'rooms_old_current_worker_id_foreign',
                'current_worker_id',
                'workers',
                'set null',
            );
        }

        Schema::dropIfExists('workers_old');
    }

    private function retargetForeignKey(
        string $table,
        string $constraint,
        string $column,
        string $references,
        string $onDelete,
    ): void {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        $exists = DB::selectOne(
            'SELECT CONSTRAINT_NAME
             FROM information_schema.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND CONSTRAINT_NAME = ?
               AND CONSTRAINT_TYPE = ?',
            [$table, $constraint, 'FOREIGN KEY']
        );

        Schema::table($table, function (Blueprint $blueprint) use ($exists, $constraint, $column, $references, $onDelete) {
            if ($exists) {
                $blueprint->dropForeign($constraint);
            }

            $fk = $blueprint->foreign($column)->references('id')->on($references);
            if ($onDelete === 'cascade') {
                $fk->cascadeOnDelete();
            } else {
                $fk->nullOnDelete();
            }
        });
    }
};
