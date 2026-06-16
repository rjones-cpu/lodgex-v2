<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_recommendations', function (Blueprint $table) {
            $table->string('category', 50)->default('general')->after('id');
            $table->string('fingerprint', 64)->nullable()->unique()->after('category');
        });

        Schema::create('ai_recommendation_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_recommendation_id')->nullable()->constrained('ai_recommendations')->nullOnDelete();
            $table->string('category', 50);
            $table->string('action', 50);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['ai_recommendation_id', 'created_at'], 'ai_rec_audit_logs_rec_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_recommendation_audit_logs');

        Schema::table('ai_recommendations', function (Blueprint $table) {
            $table->dropColumn(['category', 'fingerprint']);
        });
    }
};
