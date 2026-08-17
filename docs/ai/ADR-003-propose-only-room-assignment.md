# ADR-003: Propose-only room assignment

## Status

Accepted (17 Aug 2026)

## Context

`POST /dashboard/ai-assign-room` called `RoomAssignmentService::aiAssign()`, which wrote `room_id` and labeled the audit `room_ai_assigned`. That violates “AI must never assign rooms.”

Dashboard inventory auto-fill (`assignInventoryRoomsForQueueTabs` / `bulkAssignFromInventory`) is existing lodge-ops code. It was left in place (team rule: ask before deleting logic).

## Decision

- `aiAssign()` now refuses to write
- The HTTP route creates an `AiProposal` via `RoomInventoryIntelligenceAgent`
- Human approve calls `RoomAssignmentService::assign(..., method: 'manual')`
- New table `ai_proposals` instead of `ai_recommendations` so RU release side effects cannot fire

## Consequences

Existing `test_ai_assign_room_*` expectations change from write to propose. Manual assign and inventory bulk-assign are unchanged.
