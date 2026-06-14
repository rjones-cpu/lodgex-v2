<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company')->nullable();
            $table->string('project')->nullable();
            $table->string('gender')->nullable();
            $table->timestamps();
        });

        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('number', 20);
            $table->string('dorm');
            $table->string('room_type', 50);
            $table->string('status', 50);
            $table->foreignId('current_worker_id')->nullable()->constrained('workers')->nullOnDelete();
            $table->string('company')->nullable();
            $table->unsignedSmallInteger('hold_days')->default(0);
            $table->timestamp('status_updated_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['number', 'dorm']);
            $table->index('status');
            $table->index('dorm');
        });

        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->string('company')->nullable();
            $table->string('project')->nullable();
            $table->date('arrival_date');
            $table->date('departure_date');
            $table->string('status', 50);
            $table->string('approval_status', 50)->nullable();
            $table->string('allotment_status', 50)->nullable();
            $table->string('room_type', 50)->nullable();
            $table->unsignedTinyInteger('ai_match_score')->nullable();
            $table->timestamps();

            $table->index(['arrival_date', 'departure_date']);
        });

        Schema::create('room_holds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('worker_id')->nullable()->constrained()->nullOnDelete();
            $table->string('company')->nullable();
            $table->string('reason')->nullable();
            $table->date('return_date')->nullable();
            $table->timestamp('hold_started_at')->nullable();
            $table->unsignedSmallInteger('policy_days')->default(7);
            $table->boolean('over_policy')->default(false);
            $table->boolean('release_eligible')->default(false);
            $table->string('risk_level', 20)->default('Low');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('contractor_allotments', function (Blueprint $table) {
            $table->id();
            $table->string('contractor');
            $table->unsignedInteger('allotted');
            $table->unsignedInteger('used');
            $table->integer('variance');
            $table->unsignedInteger('no_shows')->default(0);
            $table->string('trend', 20);
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->timestamps();
        });

        Schema::create('maintenance_holds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->string('issue');
            $table->date('eta_return')->nullable();
            $table->boolean('overdue')->default(false);
            $table->string('capacity_impact', 50)->default('1 room');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('housekeeping_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->string('status', 50);
            $table->boolean('arrival_today')->default(false);
            $table->string('priority', 20);
            $table->string('eta_clean', 20)->nullable();
            $table->boolean('is_complete')->default(false);
            $table->timestamps();
        });

        Schema::create('forecast_snapshots', function (Blueprint $table) {
            $table->id();
            $table->date('forecast_date')->unique();
            $table->unsignedInteger('arrivals');
            $table->unsignedInteger('departures');
            $table->integer('net');
            $table->integer('available');
            $table->unsignedInteger('shortage')->default(0);
            $table->string('risk_level', 20);
            $table->timestamps();
        });

        Schema::create('ai_recommendations', function (Blueprint $table) {
            $table->id();
            $table->string('issue');
            $table->string('risk_level', 20);
            $table->text('data_used');
            $table->text('recommendation');
            $table->string('approval_required');
            $table->string('next_action');
            $table->string('status', 20)->default('Pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('release_candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->string('room_number', 20);
            $table->string('dorm');
            $table->text('reason');
            $table->string('recovery', 50)->default('1 room');
            $table->string('approval_required');
            $table->string('risk_level', 20);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('overflow_scenarios', function (Blueprint $table) {
            $table->id();
            $table->date('scenario_date');
            $table->unsignedInteger('shortage');
            $table->unsignedInteger('internal_recovery');
            $table->unsignedInteger('hotel_rooms');
            $table->string('cost_estimate');
            $table->text('recommendation');
            $table->string('risk_level', 20);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overflow_scenarios');
        Schema::dropIfExists('release_candidates');
        Schema::dropIfExists('ai_recommendations');
        Schema::dropIfExists('forecast_snapshots');
        Schema::dropIfExists('housekeeping_tasks');
        Schema::dropIfExists('maintenance_holds');
        Schema::dropIfExists('contractor_allotments');
        Schema::dropIfExists('room_holds');
        Schema::dropIfExists('reservations');
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('workers');
    }
};
