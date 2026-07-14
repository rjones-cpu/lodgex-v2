<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lodge_policies', function (Blueprint $table) {
            $table->json('on_hold_exempt_dorms')->nullable()->after('on_hold_dorm_restriction');
            $table->json('on_hold_exempt_guests')->nullable()->after('on_hold_exempt_dorms');
        });
    }

    public function down(): void
    {
        Schema::table('lodge_policies', function (Blueprint $table) {
            $table->dropColumn(['on_hold_exempt_dorms', 'on_hold_exempt_guests']);
        });
    }
};
