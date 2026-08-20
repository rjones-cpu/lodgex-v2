# Room Inventory Intelligence Agent

Wave 1 in-product agent. Class **P** (proposal / shadow) only.

Locked modules (Master Agent map, Ralph Jones approved 18 Aug 2026):

- **SL-02** Reservations and Occupancy (primary)
- **SL-03** Front Desk (shared)

**SL-01 is Lodge Executive Brief.** Do not bind this agent to SL-01. Do not invent module IDs.

Optional connection: SL-02 ↔ SL-03 only. Crew Hub and Major Projects stay behind the capability resolver — this agent does not require them.

## What it does

- Reads live `rooms_old` + reservation + hold + inventory OOS state
- Availability rule: **Vacant Clean** and not held, blocked, assigned, restricted, or on maintenance
- Creates `ai_proposals` rows:
  - `recommend_room` — proposed assignment
  - `flag_risk` — rooms that are not actually available, plus conflicts (double book, held vs vacant, assigned vs dirty, reservation vs inventory)
- Optionally asks the AI runner for an explanation (mock in tests; xAI when configured)
- Never calls `RoomAssignmentService::assign` except from the **human** approve path
- Never holds, releases, checks in, or writes occupancy from the agent itself

## What a person does

- **Propose room** on `/dashboard` (`POST /dashboard/ai-assign-room`) — persist a proposal
- **Approve** (`POST /ai/proposals/{id}/approve`)
  - `recommend_room` → `RoomAssignmentService::assign` (method `manual`)
  - `flag_risk` → acknowledge only; no occupancy write
- **Dismiss** (`POST /ai/proposals/{id}/dismiss`) — no write to rooms

## UI

Shadow panel (`resources/js/Components/Ai/AiShadowProposalPanel.jsx`) on:

- `/dashboard` (operations queue)
- `/room-inventory` (also runs a conflict scan)
- `/modules/reservations` (Reservation Manager; also runs a conflict scan)

The control panel button is labeled **Propose room**. It does not assign.

Do not rebuild the frozen camp-reservations Fusion drag-drop board.

## LangSmith

Optional tracing. Default project name: `lodgex-room-inventory-intelligence`.

If `LANGSMITH_API_KEY` (or `LANGCHAIN_API_KEY`) is set, `AiRunner` posts provider-neutral run events to LangSmith. If the key is missing, tracing is skipped. Tracing failures never break lodge ops.

See `.env.example` and [FOUNDATION.md](./FOUNDATION.md).

## Cloudflare MCP

Worker source: `workers/lodgex-mcp/`. Live Worker name: `lodgex-mcp` (ping + whoami today).

Read-only tools: list rooms, occupancy/reservations, Vacant Clean availability, create a proposal record. Assign / hold / release / check-in are refused.

Laravel JSON API: `/api/ai/room-inventory/*` authenticated with `LODGEX_MCP_TOKEN`. Worker env `LODGEX_API_BASE` is the LodgeX origin — do not hard-code a staging host.

This repo does not deploy the Worker. See `workers/lodgex-mcp/README.md`.

## Why not reuse `ai_recommendations`?

Room Utilization approve applies **release** side effects. Mixing room-assignment proposals into that table/controller would be unsafe. The new table follows the same recommendation fields and approve/dismiss UX.
