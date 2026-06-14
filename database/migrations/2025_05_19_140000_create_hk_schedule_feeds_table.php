<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hk_schedule_feeds', function (Blueprint $table) {
            $table->id();
            $table->string('source', 50);
            $table->string('title');
            $table->date('effective_date');
            $table->integer('arrivals_delta')->default(0);
            $table->integer('departures_delta')->default(0);
            $table->integer('workforce_delta')->default(0);
            $table->text('summary')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('received_at');
            $table->timestamps();

            $table->index(['source', 'effective_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hk_schedule_feeds');
    }
};
