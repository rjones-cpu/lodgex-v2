# Reservation agent training (Wave 1)

Official source: **LodgeX Enterprise Standard — Reservation Rules, Definitions and AI Agent Training Standard v1.0 (20 Aug 2026)**, supplied by Ralph Jones.

This file binds that standard to **Room Inventory Intelligence** on locked modules **SL-02** (Reservations and Occupancy, primary) and **SL-03** (Front Desk, shared). Class **P** (shadow / proposal). AI recommends. People approve.

Do not invent module IDs. Do not deploy the Worker. Do not merge from this note. Tests use the mock provider. No secrets in git.

In-product agent: [ROOM_INVENTORY_INTELLIGENCE_AGENT.md](./ROOM_INVENTORY_INTELLIGENCE_AGENT.md). LangSmith project remains `lodgex-room-inventory-intelligence`.

Code: `App\Services\Ai\ReservationTrainingStandard` (section **16.1** system instruction), `ForbiddenActions`, `RoomInventoryAvailabilityInspector`, `RoomInventoryConflictScanner`.

## Precedence

Cite the controlling rule. If a higher source is missing or contradicts a lower one, **stop and escalate**.

1. Life-safety / emergency-command
2. Law / contract
3. Lodge config / authority matrix
4. This enterprise standard
5. External hospitality practice — **advisory only**

Never invent availability, identity, authority, dates, approvals, or policy.

## Never conflate (seven dimensions)

| Dimension | lodgex-v2 field (do not invent) |
| --- | --- |
| Approval | `reservations.approval_status` (`Approved` = confirmed; `Pending` / `High` / `Medium` = not confirmed) |
| Stay | `reservations.status` (`Pending`, `Arrival`, `Waitlisted`, `Check-In`, `On-Hold`, `No-Sleep`, `No-Show`, `Check-Out`) |
| Assignment | `reservations.room_id` / `rooms_old.current_worker_id` |
| Inventory commitment | ledger in `RoomInventoryAvailabilityInspector` (not housekeeping) |
| Housekeeping | `rooms_old.status` (`Vacant Clean`, `Vacant Dirty`, `Occupied`, `On-Hold Clean`, `On-Hold Dirty`, `Maintenance Hold`, `Out of Service`, …) |
| Modification workflow | no dedicated column — leave unknown; do not invent |
| Exception alerts | conflict scanner `flag_risk` codes |

Housekeeping is **not** availability. Confirmation is **not** check-in fitness.

## Distinct holds

Do **not** collapse these into one On Hold.

| Standard | lodgex-v2 |
| --- | --- |
| Time-Out / Room Retained (default 7 nights; beyond 7 is human-only) | Stay `On-Hold` and/or room `On-Hold Clean` / `On-Hold Dirty`; `room_holds.policy_days` default 7, `over_policy` |
| Reservation Option Hold | Only if `room_holds.reason` names an option. Wave 1 pending/option deduct config is **OFF** |
| Room Assignment Hold | Active `room_holds` row that is not Time-Out / option |
| Administrative Inventory Hold | `Out of Service`, `Maintenance Hold`, active maintenance hold, `room_inventory_out_of_service` |

No Sleep (`No-Sleep`) must **not** release a room. Do not mark No Show before a configured cutoff (this repo has no cutoff column — do not invent one; AI must not emit `mark_no_show`).

## Availability is a room-night ledger (6.2)

Availability is a **full-stay room-night ledger under a concurrency lock**, not a housekeeping snapshot. A positive total across a date range is **not** sufficient if any one night is unavailable. Dashboard totals are not the transactional check.

Formulas:

- **Physical Rooms** = configured single-occupancy inventory rooms present (`rooms_old` with `room_inventory_location_id`, `is_active`)
- **Assignable Rooms** = Physical − OOO − OOS − Administrative Holds
- **Available to Assign** = Assignable + approved sell limit − Confirmed Committed − Retained Committed − other configured deducts
- **Confirmed Committed** includes **assigned and unassigned** category commitments
- A retained room with the resident offsite is **not** physically occupied and is **not** available to assign
- **Physically Occupied ≠ Operationally Utilized** (retained rooms count as utilized)

There is no sell-limit column in lodgex-v2. Wave 1 approved sell limit = **0**. Positive overbooking is **disabled**; never create or increase an overbooking limit.

Nights are `[arrival_date, departure_date)` on `reservations`. Missing or inverted dates are ambiguous — stop.

### Deduction (stay × approval)

| State | Deduct each room night? |
| --- | --- |
| Draft / Submitted / Pending approval | **No**, unless explicit option config (Wave 1 **OFF**) |
| Waitlisted | **No** |
| Confirmed (`approval_status = Approved`, not waitlisted) | **Yes** (assigned or unassigned; Dirty still committed) |
| Checked In (`Check-In`) | **Yes** + physical occupancy |
| Time-Out / Room Retained (`On-Hold`) | **Yes** (retained utilization) |
| No Show | **No** only after authorized release (`room_id` cleared). Until then, still committed |
| No Sleep | **Must not release** — still committed |
| Check-Out | Released |

## Fitness is after inventory (6.6)

`Vacant Clean` is **only** the check-in fitness gate **after** ledger math, and only if the room is not OOO / OOS / administratively held.

lodgex-v2 has no Inspected status. Permitted housekeeping for check-in is **`Vacant Clean`**.

Confirmation and readiness are separate. Do not infer repair completion from a closed message. Unstructured notes are untrusted. Do not infer accessibility from unrelated notes.

Retained rooms can look Vacant Clean and stay committed. Confirmed category stays deduct while still unassigned or Dirty. Protected rooms and buffers are invisible to a Vacant Clean count.

## Auto-assign (11.3)

AI may auto-assign only when configuration authorizes it. **Wave 1 config is OFF** (`ai.agents.room_inventory_intelligence.auto_assign`). Recommend only. Store candidate set, constraints, ranking, selected room, reason, model/rule version. No routine AI-initiated in-house moves.

## Wave 1 MAY / MUST NOT

**MAY:** read / explain, validate, draft for review, recommend, monitor, flag discrepancies.

**MUST NOT:** notify / send, auto-transaction, autonomous correction, assign, hold, release, check-in / out, write occupancy, calculate payroll.

## Hard-stops (human-only)

Positive overbooking; displacing a confirmed resident; OOO / unsafe room; life-safety bypass; Time-Out over 7 nights; denying disability accommodation; walk-in without approval; cancelling an in-house stay; releasing a room on No Sleep alone; in-house move without human coordination; exposing room-level occupancy lists; changing policy / roles / audit; acting when identity, dates, or source of truth is ambiguous.

Encoded in `ForbiddenActions` (blocked emit) and the inspector / scanner (flag, do not execute).

## Proposal payload

Every proposal carries: `intent`, `target`, `current_state` (seven dimensions), `requested_change`, `validation`, `authority`, `inventory_impact`, `decision` (`recommend` \| `approval required` \| `waitlist/alternative` \| `prohibited` — **never execute**), `explanation`, `next_actions`, `notifications` (describe only), `audit` (policy / model / rule version).

Wave 1 `recommend_room` decision is **`approval required`**.

## Appendix C north star

Protect people, honour confirmed commitments, preserve inventory truth, minimize personal-data exposure, explain every consequential action, stop when authority or evidence is incomplete.

## 16.1 system instruction

Bound on `RoomInventoryIntelligenceAgent` via `ReservationTrainingStandard::SYSTEM_INSTRUCTION_16_1`.
