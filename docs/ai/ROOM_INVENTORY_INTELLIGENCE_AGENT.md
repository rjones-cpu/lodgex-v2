# Room Inventory Intelligence Agent

Capability: **SL-01** (observational binding to `/room-inventory` + dashboard matching).  
Optional connections only: SL-02 (reservations), SL-04 (utilization). Not required.

## What it does

- Reads assignable rooms through `RoomAiMatchingService` + `RoomAvailabilityService`
- Creates an `ai_proposals` row (`action=recommend_room`)
- Optionally asks the AI runner for an explanation (mock in tests; xAI when configured)
- Never calls `RoomAssignmentService::assign` or `aiAssign`

## What a person does

- **Propose room** on `/dashboard` (`POST /dashboard/ai-assign-room`) — persist a proposal
- **Approve** (`POST /ai/proposals/{id}/approve`) — `RoomAssignmentService::assign` (method `manual`)
- **Dismiss** (`POST /ai/proposals/{id}/dismiss`) — no write to rooms

## UI

Shadow panel (`resources/js/Components/Ai/AiShadowProposalPanel.jsx`) on:

- `/dashboard` (operations queue)
- `/room-inventory`

The control panel button is labeled **Propose room**. It does not assign.

## Why not reuse `ai_recommendations`?

Room Utilization approve applies **release** side effects. Mixing room-assignment proposals into that table/controller would be unsafe. The new table follows the same recommendation fields and approve/dismiss UX.
