<?php

namespace App\Support;

use App\Models\LodgePolicy;

/**
 * Shapes lodge policy rows for the Policies UI and downstream modules.
 */
class LodgePolicyPresenter
{
    private const WEEKDAYS = [
        0 => 'Sunday',
        1 => 'Monday',
        2 => 'Tuesday',
        3 => 'Wednesday',
        4 => 'Thursday',
        5 => 'Friday',
        6 => 'Saturday',
    ];

    /**
     * @return array<string, mixed>
     */
    public static function present(LodgePolicy $policy): array
    {
        return [
            'onHold' => [
                'enabled' => $policy->on_hold_enabled,
                'maxHoldDays' => $policy->max_hold_days,
                'dormRestriction' => $policy->on_hold_dorm_restriction,
                'exemptDorms' => array_values($policy->on_hold_exempt_dorms ?? []),
                'exemptGuests' => array_values($policy->on_hold_exempt_guests ?? []),
            ],
            'noShow' => [
                'cutoffTime' => $policy->no_show_cutoff_time,
                'releaseRequiresApproval' => $policy->no_show_release_requires_approval,
            ],
            'walkIn' => [
                'allowed' => $policy->walk_ins_allowed,
                'requireSupervisorApproval' => $policy->walk_ins_require_supervisor_approval,
                'allowOneNight' => $policy->walk_ins_allow_one_night,
                'requireReason' => $policy->walk_ins_require_reason,
            ],
            'approval' => [
                'autoApprovalEnabled' => $policy->auto_approval_enabled,
                'sameDayRequiresApproval' => $policy->same_day_reservations_require_approval,
            ],
            'extensions' => [
                'submissionCutoffDay' => $policy->extension_submission_cutoff_day,
                'submissionCutoffDayLabel' => self::WEEKDAYS[$policy->extension_submission_cutoff_day] ?? 'Sunday',
                'submissionCutoffTime' => $policy->extension_submission_cutoff_time,
                'hotelOverflowDecisionCutoffTime' => $policy->hotel_overflow_decision_cutoff_time,
            ],
            'cancellation' => [
                'autoReleaseEnabled' => $policy->cancellation_auto_release_enabled,
            ],
            'forecast' => [
                'horizonDays' => $policy->forecast_horizon_days,
            ],
            // Flat keys kept for existing Dashboard on-hold wiring.
            'onHoldEnabled' => $policy->on_hold_enabled,
            'maxHoldDays' => $policy->max_hold_days,
        ];
    }
}
