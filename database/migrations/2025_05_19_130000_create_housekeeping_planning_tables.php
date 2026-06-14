<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('housekeepers', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('role', 50)->default('Housekeeper');
            $table->string('shift', 20)->default('Day');
            $table->time('available_start')->nullable();
            $table->time('available_end')->nullable();
            $table->unsignedTinyInteger('max_hours')->default(11);
            $table->unsignedTinyInteger('max_rooms')->default(29);
            $table->unsignedTinyInteger('max_checkouts')->default(10);
            $table->decimal('max_points', 4, 1)->default(36);
            $table->string('primary_dorm')->nullable();
            $table->string('skill_level', 20)->default('Standard');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hk_cleaning_standards', function (Blueprint $table) {
            $table->id();
            $table->string('task_type', 50)->unique();
            $table->unsignedSmallInteger('default_minutes');
            $table->decimal('default_points', 4, 1);
            $table->boolean('inspection_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hk_workload_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('Default');
            $table->unsignedTinyInteger('max_shift_hours')->default(11);
            $table->unsignedTinyInteger('max_rooms_per_day')->default(29);
            $table->unsignedTinyInteger('max_checkouts_per_day')->default(10);
            $table->decimal('max_points_per_day', 4, 1)->default(36);
            $table->unsignedSmallInteger('productive_minutes')->default(480);
            $table->unsignedSmallInteger('safety_meeting_minutes')->default(30);
            $table->unsignedSmallInteger('meal_break_minutes')->default(30);
            $table->boolean('prefer_single_dorm')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hk_work_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('housekeeper_id')->nullable()->constrained('housekeepers')->nullOnDelete();
            $table->date('work_date');
            $table->string('task_type', 50);
            $table->string('priority', 20)->default('Medium');
            $table->decimal('points', 4, 1);
            $table->unsignedSmallInteger('estimated_minutes');
            $table->timestamp('required_by')->nullable();
            $table->string('status', 30)->default('Pending');
            $table->boolean('inspection_required')->default(false);
            $table->boolean('arrival_today')->default(false);
            $table->string('readiness_risk', 20)->default('low');
            $table->string('fingerprint', 64)->nullable()->unique();
            $table->text('notes')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['work_date', 'status']);
            $table->index(['housekeeper_id', 'work_date']);
        });

        Schema::create('hk_daily_assignments', function (Blueprint $table) {
            $table->id();
            $table->date('assignment_date');
            $table->foreignId('housekeeper_id')->constrained('housekeepers')->cascadeOnDelete();
            $table->unsignedSmallInteger('total_rooms')->default(0);
            $table->unsignedSmallInteger('total_checkouts')->default(0);
            $table->decimal('total_points', 5, 1)->default(0);
            $table->unsignedSmallInteger('total_minutes')->default(0);
            $table->string('assigned_dorms')->nullable();
            $table->string('status', 20)->default('Draft');
            $table->boolean('overload_flag')->default(false);
            $table->timestamps();

            $table->unique(['assignment_date', 'housekeeper_id']);
        });

        Schema::create('hk_inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hk_work_task_id')->constrained('hk_work_tasks')->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->string('inspector_name')->nullable();
            $table->string('result', 20)->default('Pending');
            $table->unsignedTinyInteger('score')->nullable();
            $table->boolean('reclean_required')->default(false);
            $table->text('deficiencies')->nullable();
            $table->timestamp('inspected_at')->nullable();
            $table->timestamps();
        });

        Schema::create('hk_forecasts', function (Blueprint $table) {
            $table->id();
            $table->date('forecast_date')->unique();
            $table->unsignedInteger('arrivals')->default(0);
            $table->unsignedInteger('departures')->default(0);
            $table->unsignedInteger('stayovers')->default(0);
            $table->unsignedInteger('vacant_dirty')->default(0);
            $table->unsignedInteger('on_hold_dirty')->default(0);
            $table->decimal('estimated_points', 8, 1)->default(0);
            $table->unsignedInteger('estimated_minutes')->default(0);
            $table->unsignedTinyInteger('required_housekeepers')->default(0);
            $table->unsignedTinyInteger('available_housekeepers')->default(0);
            $table->integer('shortage_surplus')->default(0);
            $table->string('confidence', 20)->default('medium');
            $table->timestamps();
        });

        Schema::create('hk_ai_recommendations', function (Blueprint $table) {
            $table->id();
            $table->string('category', 50);
            $table->string('fingerprint', 64)->nullable()->unique();
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

        Schema::create('hk_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('subject_type', 50);
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('category', 50)->nullable();
            $table->string('action', 50);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hk_audit_logs');
        Schema::dropIfExists('hk_ai_recommendations');
        Schema::dropIfExists('hk_forecasts');
        Schema::dropIfExists('hk_inspections');
        Schema::dropIfExists('hk_daily_assignments');
        Schema::dropIfExists('hk_work_tasks');
        Schema::dropIfExists('hk_workload_rules');
        Schema::dropIfExists('hk_cleaning_standards');
        Schema::dropIfExists('housekeepers');
    }
};
