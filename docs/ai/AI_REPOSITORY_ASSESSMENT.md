# LodgeX AI repository assessment

Assessed from the lodgex-v2 tree on 17 Aug 2026. This is what the code actually contains, not a target architecture.

## Stack

- Laravel 12, Inertia 2, React (JSX), Tailwind, Ziggy, PHPUnit 11
- SQLite in tests (`phpunit.xml`); app default is also SQLite in `.env.example`
- No existing LLM client, no `XAI_*` / OpenAI config, no feature-flag package

## Products and module IDs

- Official IDs `CH-01`–`CH-11`, `SL-01`–`SL-11`, `MP-01`–`MP-09` do **not** appear anywhere in this repo.
- There is no fourth product. Command Center copy treats Activity Director / Chef / guest food surfaces as Smart Lodge views (`events-director`, `food-preferences`), not standalone products.
- Major Projects is mentioned only as an external integration label in Command Center widget docs (`Major Projects Master Schedule`). There is no MP code, and no `MP-10`.

## What already exists (live-ish Smart Lodge)

| Surface | Evidence | AI behavior today |
|---|---|---|
| Reservation ops `/dashboard` | `DashboardController`, `Dashboard.jsx` | `RoomAiMatchingService` suggests `aiRoom`. `POST /dashboard/ai-assign-room` **wrote** a room via `RoomAssignmentService::aiAssign()`. Dashboard operations mode also auto-fills Waitlisted / In House / On-Hold from inventory (`assignInventoryRoomsForQueueTabs`) — existing lodge-ops path, not the AI Assign button. |
| Room Inventory `/room-inventory` | `RoomInventoryController` (ported from camp-reservations) | Counts, OOS, dorm off-market. No AI panel. |
| Room Utilization | `RoomUtilizationAdvisorService`, `AiRecommendation` | Rule-based recommendations with approve/dismiss. Approve of `release` **does** change room status after a human click. |
| Housekeeping Planning | `HousekeepingAdvisorService`, `HkAiRecommendation` | Same approve/dismiss pattern. Publish assignments is a separate human route. |
| Policies `/policies` | `PolicyController` | Lodge policy, including on-hold. |
| Accommodation Workforce | `WorkforceReservationSyncService`, `X-Lodgex-Key` | camp-reservations handoff / iframe. Live bookings still live there. |

## Command Center

- Route `/command-center/ai-recommendations` exists.
- `.cursor/rules/command-center.mdc` and widget docs say the parent is decision-support only.
- `CommandCenterService` builds large demo/static payloads. Treat Command Center widgets as **not live operational data** unless a child module is the source.

## Availability and assignment rules (verified)

- `RoomAvailabilityService::isAvailableForAssignment()`: active, status **Vacant Clean**, no active hold, no active maintenance hold.
- `RoomAiMatchingService::inventoryAssignableRooms()` also requires `fromInventory()`, `current_worker_id` null, then the availability filter.
- Matching is deterministic scoring (type, company, gender/dorm). It is not an LLM.

## Recommendation / approve pattern to reuse

Housekeeping and Room Utilization already persist:

- issue, data used, risk, recommendation, approval required, next action, status, fingerprint
- `POST .../recommendations/{id}/approve` and `.../dismiss`
- audit log rows

Do not route Room Inventory proposals through `RoomUtilizationController::approveRecommendation` — that path applies on-hold **release** side effects.

## Auth / roles

- `users` has no `role` column.
- Room Inventory comments say there is no Spatie gate in lodgex-v2.
- `CampManagerModificationRequestsService` already probes Spatie `roles` / `model_has_roles` **if those tables exist** (production camp-reservations leftover). Lodge Manager is not modeled in this schema.
- Overtime approval UI/service did not exist. Housekeeping copy only *recommends* reviewing overtime.

## Scorecard, payroll, readiness, LMS, timesheets, journey

- None of these modules exist as code in lodgex-v2.
- No payroll/wage calculator (must not be added as a calculator of pay).
- No scorecard UI. Grade rule (lowest applicable component, never averaged) was not implemented.

## Tests before this work

PHPUnit suites under `tests/Feature` and `tests/Unit`. Notable existing assertion: `DashboardRoomAssignmentTest::test_ai_assign_room_picks_best_available_room` expected `POST /dashboard/ai-assign-room` to **write** `room_id` and `room_ai_assigned`.

`RoomUtilizationAdvisorServiceTest::test_room_utilization_page_includes_advisor_payload` expects Inertia component `RoomUtilizationManager`, but `RoomUtilizationController::index` now renders `RoomUtilizationOverview`. That mismatch predates this work.

## Frozen / do-not-rebuild

- camp-reservations drag-drop schedule is not in this repo. The hook is `AccommodationWorkforce*` + `config/accommodation_workforce.php`.
- Do not stand up a second reservation system. CH-03 + SL-02 are the future handoff; they are not implemented here.

## Gaps this foundation fills

1. Provider-neutral LLM interface + xAI Responses adapter + mock provider
2. Feature flags defaulting to **shadow**
3. Capability resolver for official IDs only (federated, optional connections)
4. Audit for provider calls and new proposals (separate from RU/HK tables)
5. Convert dashboard AI assign from write → propose
6. Room Inventory Intelligence Agent (read + proposal) + shadow UI
7. Overtime: Lodge Manager only (authorization + service, fail closed)
8. Scorecard grade calculator (lowest component; AI may explain only)
