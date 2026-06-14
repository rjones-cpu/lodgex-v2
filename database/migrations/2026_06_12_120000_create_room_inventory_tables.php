<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Room Inventory tables — ported from camp-reservations.
 *
 * Differences from the camp-reservations source:
 *   - Drops `camp_id` columns and FKs (lodgex-v2 has no `camps` table).
 *     Inventory is single-tenant; if multi-camp is added later, a
 *     follow-up migration can add `camp_id`.
 *   - All other columns, indexes, types, and defaults match the source
 *     (see camp-reservations: 2026_03_17_120000, 2026_03_17_120001,
 *     2026_04_08_130000, 2026_04_08_140000).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_inventory_locations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('location_type', 32); // dorm | floor | wellsite
            $table->unsignedInteger('total_rooms')->default(0);
            $table->unsignedInteger('rooms_executive')->default(0);
            $table->unsignedInteger('rooms_senior_executive')->default(0);
            $table->unsignedInteger('rooms_wellsite')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('sort_order');
        });

        Schema::create('room_inventory_out_of_service', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_inventory_location_id')
                ->nullable()
                ->constrained('room_inventory_locations')
                ->nullOnDelete();
            $table->string('room_identifier');
            $table->string('room_category', 32); // executive | senior_executive | wellsite
            $table->string('reason', 32); // maintenance | storage | medic_room | other
            $table->text('other_note')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
        });

        Schema::create('dorm_off_market_holds', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('portal_dorm_id');
            $table->timestamp('returned_at')->nullable();
            $table->timestamp('expected_return_at')->nullable();
            $table->timestamps();

            $table->index('portal_dorm_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dorm_off_market_holds');
        Schema::dropIfExists('room_inventory_out_of_service');
        Schema::dropIfExists('room_inventory_locations');
    }
};
