<?php

namespace App\Services\Ai;

class ForbiddenActions
{
    /**
     * Actions AI must never execute or emit as executable commands.
     *
     * @var list<string>
     */
    public const BLOCKED = [
        'assign',
        'assign_room',
        'hold',
        'hold_room',
        'release',
        'release_hold',
        'release_room',
        'check_in',
        'check_in_guest',
        'write_occupancy',
        'publish_schedule',
        'set_scorecard_grade',
        'change_scorecard_grade',
        'suppress_scorecard_grade',
        'send_formal_notice',
        'publish_assignment',
        'trigger_overflow',
        'send_contractor_notice',
        'calculate_payroll',
        'calculate_wages',
        'write_database',
        'auto_execute',
    ];

    /**
     * Proposal-only actions the validator may accept.
     *
     * @var list<string>
     */
    public const ALLOWED_PROPOSALS = [
        'recommend_room',
        'explain',
        'flag_risk',
        'summarize',
    ];

    public static function isBlocked(string $action): bool
    {
        return in_array($action, self::BLOCKED, true);
    }

    public static function isAllowedProposal(string $action): bool
    {
        return in_array($action, self::ALLOWED_PROPOSALS, true);
    }
}
