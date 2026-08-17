<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('capability_id', 16);
            $table->string('agent', 80);
            $table->string('action', 50);
            $table->string('fingerprint', 64)->nullable();
            $table->string('issue');
            $table->string('risk_level', 20);
            $table->text('data_used');
            $table->text('recommendation');
            $table->string('approval_required');
            $table->string('next_action');
            $table->string('status', 20)->default('Pending');
            $table->json('payload')->nullable();
            $table->text('explanation')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'fingerprint']);
            $table->index(['agent', 'status']);
            $table->index('capability_id');
        });

        Schema::create('ai_proposal_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_proposal_id')->nullable()->constrained('ai_proposals')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 50);
            $table->text('notes')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['ai_proposal_id', 'created_at']);
        });

        Schema::create('ai_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 50);
            $table->string('capability_id', 16)->nullable();
            $table->string('agent', 80)->nullable();
            $table->string('provider', 40)->nullable();
            $table->string('model', 80)->nullable();
            $table->string('subject_type', 50)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->text('notes')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['action', 'created_at']);
            $table->index(['capability_id', 'agent']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_audit_logs');
        Schema::dropIfExists('ai_proposal_audit_logs');
        Schema::dropIfExists('ai_proposals');
    }
};
