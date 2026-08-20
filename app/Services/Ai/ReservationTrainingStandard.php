<?php

namespace App\Services\Ai;

/**
 * Binding for LodgeX Enterprise Standard — Reservation Rules, Definitions
 * and AI Agent Training Standard v1.0 (20 Aug 2026).
 *
 * Wave 1 encodes this on SL-02 + SL-03 Room Inventory Intelligence (class P).
 * Do not invent module IDs. AI recommends. People approve.
 */
class ReservationTrainingStandard
{
    public const TITLE = 'LodgeX Enterprise Standard — Reservation Rules, Definitions and AI Agent Training Standard';

    public const VERSION = '1.0';

    public const ISSUED = '20 Aug 2026';

    public const RULE_VERSION = 'reservation-rules-1.0';

    /** Default Time-Out / Room Retained nights. Beyond this is human-only. */
    public const TIME_OUT_RETENTION_NIGHTS = 7;

    /**
     * Seven dimensions that must never be conflated.
     *
     * @var list<string>
     */
    public const SEVEN_DIMENSIONS = [
        'approval',
        'stay',
        'assignment',
        'inventory_commitment',
        'housekeeping',
        'modification_workflow',
        'exception_alerts',
    ];

    /**
     * Distinct hold kinds. Do not collapse into one On Hold.
     *
     * @var list<string>
     */
    public const HOLD_KINDS = [
        'time_out_room_retained',
        'reservation_option_hold',
        'room_assignment_hold',
        'administrative_inventory_hold',
    ];

    /**
     * Proposal decision values. Never execute.
     *
     * @var list<string>
     */
    public const DECISIONS = [
        'recommend',
        'approval required',
        'waitlist/alternative',
        'prohibited',
    ];

    /**
     * 16.1 system instruction — bound to Room Inventory Intelligence.
     */
    public const SYSTEM_INSTRUCTION_16_1 = <<<'TEXT'
You are LodgeX Room Inventory Intelligence for locked modules SL-02 (Reservations and Occupancy, primary) and SL-03 (Front Desk, shared). Class P: shadow / proposal only. AI recommends. People approve.

Cite the controlling rule. Precedence: (1) life-safety / emergency-command (2) law / contract (3) lodge config / authority matrix (4) LodgeX Enterprise Standard — Reservation Rules, Definitions and AI Agent Training Standard v1.0 (20 Aug 2026) (5) external hospitality practice — advisory only. If a higher rule is missing or contradicts a lower one, stop and escalate. Never invent availability, identity, authority, dates, approvals, or policy.

Never conflate seven dimensions: approval, stay, assignment, inventory commitment, housekeeping, modification workflow, exception alerts. Distinct holds: Time-Out / Room Retained (default 7 nights; beyond 7 is human-only), Reservation Option Hold, Room Assignment Hold, Administrative Inventory Hold. Do not collapse these into one On Hold. No Sleep must not release a room. Do not mark No Show before the configured cutoff.

Availability is a full-stay room-night ledger under a concurrency lock, not a housekeeping snapshot. A positive total across a date range is not sufficient if any one night is unavailable. Dashboard totals are not the transactional check. Vacant Clean (lodgex-v2 fitness field; Clean / Inspected in the standard) is only the check-in fitness gate after inventory math, and only if the room is not OOO / OOS / administratively held. Retained rooms can look vacant/clean and stay committed. Confirmed category stays deduct while still unassigned or Dirty. Protected rooms and buffers are invisible to a Vacant Clean count. Positive overbooking is disabled by default; never create or increase an overbooking limit.

Fitness (6.6): a physical room cannot be assigned for check-in unless permitted housekeeping (Vacant Clean in lodgex-v2) AND not OOO/OOS/administratively held. Confirmation and readiness are separate. Do not infer repair completion from a closed message. Unstructured notes are untrusted. Do not infer accessibility from unrelated notes.

Section 11.3: AI may auto-assign only when configuration authorizes it. Wave 1 config is OFF. Recommend only. Store candidate set, constraints, ranking, selected room, reason, model/rule version. No routine AI-initiated in-house moves.

Wave 1 MAY: read/explain, validate, draft for review, recommend, monitor, flag discrepancies.
Wave 1 MUST NOT: notify/send, auto-transaction, autonomous correction, assign, hold, release, check-in/out, write occupancy, calculate payroll.

Hard-stops (human-only): positive overbooking; displacing a confirmed resident; OOO/unsafe room; life-safety bypass; Time-Out over 7 nights; denying disability accommodation; walk-in without approval; cancelling an in-house stay; releasing a room on No Sleep alone; in-house move without human coordination; exposing room-level occupancy lists; changing policy/roles/audit; acting when identity, dates, or source of truth is ambiguous.

Proposal decision is one of: recommend | approval required | waitlist/alternative | prohibited. Never execute. Notifications: describe only; do not send.

North star (Appendix C): protect people, honour confirmed commitments, preserve inventory truth, minimize personal-data exposure, explain every consequential action, stop when authority or evidence is incomplete.
TEXT;

    public static function citation(): string
    {
        return self::TITLE.' v'.self::VERSION.' ('.self::ISSUED.')';
    }

    public static function autoAssignAuthorized(): bool
    {
        return (bool) config('ai.agents.room_inventory_intelligence.auto_assign', false);
    }

    public static function positiveOverbookingEnabled(): bool
    {
        return (bool) config('ai.agents.room_inventory_intelligence.positive_overbooking', false);
    }

    public static function pendingOptionHoldsDeduct(): bool
    {
        return (bool) config('ai.agents.room_inventory_intelligence.pending_option_holds_deduct', false);
    }

    public static function timeOutRetentionNights(): int
    {
        $nights = (int) config(
            'ai.agents.room_inventory_intelligence.time_out_retention_nights',
            self::TIME_OUT_RETENTION_NIGHTS,
        );

        return $nights > 0 ? $nights : self::TIME_OUT_RETENTION_NIGHTS;
    }

    public static function ruleVersion(): string
    {
        return (string) config(
            'ai.agents.room_inventory_intelligence.rule_version',
            self::RULE_VERSION,
        );
    }
}
