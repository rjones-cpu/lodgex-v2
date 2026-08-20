<?php

namespace App\Services\Ai;

class ForbiddenActions
{
    /**
     * Actions AI must never execute or emit as executable commands.
     *
     * Includes Wave 1 hard-stops from LodgeX Enterprise Standard v1.0
     * (Reservation Rules, 20 Aug 2026). Human-only.
     *
     * @var list<string>
     */
    public const BLOCKED = [
        'assign',
        'assign_room',
        'auto_assign',
        'hold',
        'hold_room',
        'release',
        'release_hold',
        'release_room',
        'release_on_no_sleep',
        'check_in',
        'check_in_guest',
        'check_out',
        'write_occupancy',
        'publish_schedule',
        'set_scorecard_grade',
        'change_scorecard_grade',
        'suppress_scorecard_grade',
        'send_formal_notice',
        'notify',
        'send',
        'send_notice',
        'publish_assignment',
        'trigger_overflow',
        'send_contractor_notice',
        'calculate_payroll',
        'calculate_wages',
        'write_database',
        'auto_execute',
        'auto_transaction',
        'autonomous_correction',
        'overbook',
        'positive_overbook',
        'increase_overbooking_limit',
        'displace_confirmed_resident',
        'assign_ooo',
        'assign_oos',
        'assign_unsafe',
        'bypass_life_safety',
        'time_out_over_7',
        'timeout_over_seven',
        'deny_disability_accommodation',
        'walk_in',
        'cancel_in_house',
        'in_house_move',
        'expose_occupancy_list',
        'change_policy',
        'change_roles',
        'change_audit',
        'mark_no_show',
        'execute',
    ];

    /**
     * Proposal-only actions the validator may accept (Wave 1 MAY).
     *
     * @var list<string>
     */
    public const ALLOWED_PROPOSALS = [
        'recommend_room',
        'explain',
        'flag_risk',
        'summarize',
        'validate',
        'draft_for_review',
        'monitor',
    ];

    /**
     * @var list<string>
     */
    public const EXECUTABLE_DECISIONS = [
        'execute',
        'executed',
        'auto',
        'auto_execute',
    ];

    public static function isBlocked(string $action): bool
    {
        return in_array($action, self::BLOCKED, true);
    }

    public static function isAllowedProposal(string $action): bool
    {
        return in_array($action, self::ALLOWED_PROPOSALS, true);
    }

    public static function isExecutableDecision(string $decision): bool
    {
        return in_array(strtolower(trim($decision)), self::EXECUTABLE_DECISIONS, true);
    }
}
