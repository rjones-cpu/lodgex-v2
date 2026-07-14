<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-operator lodge policy settings, surfaced in the Policies tab.
 *
 * Currently holds the On-Hold policy: whether companies may place rooms on
 * hold at all, and (when allowed) the maximum number of days a room may stay
 * on hold before the request must be escalated to the scheduling manager for
 * approval. One row per owning user (matches the BelongsToUser scoping used
 * across the other module tables).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lodge_policies', function (Blueprint $table) {
            $table->id();
            // `users.id` is INT UNSIGNED on this (legacy) database, so the owner
            // column must be the exact same type. Using foreignId() would create
            // a BIGINT and break the FK with errno 150 (matches the pattern in
            // 2026_06_18_120000_scope_module_data_to_users).
            $table->unsignedInteger('user_id')->nullable();
            $table->boolean('on_hold_enabled')->default(true);
            $table->unsignedSmallInteger('max_hold_days')->default(7);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            // One policy record per owner.
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lodge_policies');
    }
};
