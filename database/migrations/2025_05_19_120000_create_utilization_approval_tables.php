<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('utilization_approval_requests', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50);
            $table->string('title');
            $table->text('summary');
            $table->string('risk_level', 20)->default('Medium');
            $table->string('status', 20)->default('Pending');
            $table->string('approval_required');
            $table->string('fingerprint', 64)->nullable()->unique();
            $table->json('payload')->nullable();
            $table->foreignId('ai_recommendation_id')->nullable()->constrained('ai_recommendations')->nullOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'type']);
        });

        Schema::create('utilization_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('subject_type', 50);
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('action', 50);
            $table->string('category', 50)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('utilization_audit_logs');
        Schema::dropIfExists('utilization_approval_requests');
    }
};
