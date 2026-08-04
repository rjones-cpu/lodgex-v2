<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * LodgeX room rows live in `rooms_old` (camp-reservations already owns `rooms`).
 * Retarget module FKs so dashboard room assignment can persist.
 */
return new class extends Migration
{
    /** @var list<array{0: string, 1: string, 2: string, 3: string}> */
    private array $foreignKeys = [
        ['reservations', 'reservations_room_id_foreign', 'room_id', 'set null'],
        ['room_holds', 'room_holds_room_id_foreign', 'room_id', 'cascade'],
        ['maintenance_holds', 'maintenance_holds_room_id_foreign', 'room_id', 'cascade'],
        ['housekeeping_tasks', 'housekeeping_tasks_room_id_foreign', 'room_id', 'cascade'],
        ['release_candidates', 'release_candidates_room_id_foreign', 'room_id', 'cascade'],
        ['hk_work_tasks', 'hk_work_tasks_room_id_foreign', 'room_id', 'cascade'],
        ['hk_inspections', 'hk_inspections_room_id_foreign', 'room_id', 'cascade'],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('rooms_old')) {
            return;
        }

        foreach ($this->foreignKeys as [$table, $constraint, $column, $onDelete]) {
            $this->retargetForeignKey($table, $constraint, $column, 'rooms_old', $onDelete);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('rooms')) {
            return;
        }

        foreach ($this->foreignKeys as [$table, $constraint, $column, $onDelete]) {
            $this->retargetForeignKey($table, $constraint, $column, 'rooms', $onDelete);
        }
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

        $driver = Schema::getConnection()->getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        $exists = DB::selectOne(
            'SELECT CONSTRAINT_NAME AS name
             FROM information_schema.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND CONSTRAINT_NAME = ?
               AND CONSTRAINT_TYPE = ?',
            [$table, $constraint, 'FOREIGN KEY']
        );

        // Drop whatever FK currently owns this column (name may differ).
        $current = DB::selectOne(
            'SELECT CONSTRAINT_NAME AS name
             FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND COLUMN_NAME = ?
               AND REFERENCED_TABLE_NAME IS NOT NULL
             LIMIT 1',
            [$table, $column]
        );

        if ($current && ! empty($current->name)) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$current->name}`");
        } elseif ($exists && ! empty($exists->name)) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$exists->name}`");
        }

        Schema::table($table, function (Blueprint $blueprint) use ($column, $references, $onDelete, $constraint) {
            $fk = $blueprint->foreign($column, $constraint)->references('id')->on($references);
            if ($onDelete === 'cascade') {
                $fk->cascadeOnDelete();
            } else {
                $fk->nullOnDelete();
            }
        });
    }
};
