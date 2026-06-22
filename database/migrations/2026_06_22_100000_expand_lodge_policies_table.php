<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Expand operator-scoped lodge policies with configurable reservation rules
 * from LodgeX_Reservation_Rules_Policies_Definitions.docx.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lodge_policies', function (Blueprint $table) {
            // On-hold (section 14 + project examples)
            $table->string('on_hold_dorm_restriction', 120)->nullable()->after('max_hold_days');

            // No-show / late arrival (section 13)
            $table->string('no_show_cutoff_time', 5)->default('07:00')->after('on_hold_dorm_restriction');
            $table->boolean('no_show_release_requires_approval')->default(true)->after('no_show_cutoff_time');

            // Walk-in / exception (section 12)
            $table->boolean('walk_ins_allowed')->default(true)->after('no_show_release_requires_approval');
            $table->boolean('walk_ins_require_supervisor_approval')->default(true)->after('walk_ins_allowed');
            $table->boolean('walk_ins_allow_one_night')->default(true)->after('walk_ins_require_supervisor_approval');
            $table->boolean('walk_ins_require_reason')->default(true)->after('walk_ins_allow_one_night');

            // Approval (section 7)
            $table->boolean('auto_approval_enabled')->default(false)->after('walk_ins_require_reason');
            $table->boolean('same_day_reservations_require_approval')->default(true)->after('auto_approval_enabled');

            // Extensions / hotel overflow timing (section 21 examples)
            $table->unsignedTinyInteger('extension_submission_cutoff_day')->default(0)->after('same_day_reservations_require_approval');
            $table->string('extension_submission_cutoff_time', 5)->default('12:00')->after('extension_submission_cutoff_day');
            $table->string('hotel_overflow_decision_cutoff_time', 5)->default('16:00')->after('extension_submission_cutoff_time');

            // Cancellation (section 11)
            $table->boolean('cancellation_auto_release_enabled')->default(true)->after('hotel_overflow_decision_cutoff_time');

            // Forecast horizon (section 21)
            $table->unsignedSmallInteger('forecast_horizon_days')->default(14)->after('cancellation_auto_release_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('lodge_policies', function (Blueprint $table) {
            $table->dropColumn([
                'on_hold_dorm_restriction',
                'no_show_cutoff_time',
                'no_show_release_requires_approval',
                'walk_ins_allowed',
                'walk_ins_require_supervisor_approval',
                'walk_ins_allow_one_night',
                'walk_ins_require_reason',
                'auto_approval_enabled',
                'same_day_reservations_require_approval',
                'extension_submission_cutoff_day',
                'extension_submission_cutoff_time',
                'hotel_overflow_decision_cutoff_time',
                'cancellation_auto_release_enabled',
                'forecast_horizon_days',
            ]);
        });
    }
};
