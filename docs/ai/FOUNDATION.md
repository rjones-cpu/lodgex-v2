# AI foundation

## Runtime

```
Controller / Agent
    → CapabilityResolver (official IDs only; products standalone)
    → AiFeatureFlags (default mode=shadow)
    → AiRunner → AiProviderRegistry → MockProvider | XaiProvider
    → AiOutputValidator (blocks forbidden actions)
    → AiAuditLogger (no secrets)
    → AiProposal (pending) → human Approve/Dismiss
    → existing service (e.g. RoomAssignmentService::assign)
```

Config: `config/ai.php`  
Env: see `.env.example` (`AI_MODE=shadow`, `AI_PROVIDER=xai`, `XAI_API_KEY=`)  
Tests force `AI_PROVIDER=mock` in `phpunit.xml`.

## Turn the flag on

Shadow is already the default (`AI_ENABLED=true`, `AI_MODE=shadow`).

1. Copy `.env.example` keys into `.env` (never commit a real key).
2. Set `XAI_API_KEY` from the xAI console.
3. Set `AI_PROVIDER=xai` (already the non-test default). If the key is empty, the registry falls back to `mock`.
4. Optional: `AI_DEFAULT_MODEL=grok-4.6` (official slugs only).
5. Optional: `AI_ROOM_INVENTORY_AGENT=true` (default true).
6. Run `php artisan migrate` for `ai_proposals`, `ai_proposal_audit_logs`, `ai_audit_logs`.
7. Open `/dashboard` or `/room-inventory`. Propose a room, then Approve (human) or Dismiss.

`AI_MODE=off` disables generation. `AI_MODE=propose` is the same write policy as shadow: AI still cannot assign; humans still use `RoomAssignmentService::assign`.

## Providers

- Interface: `App\Services\Ai\Contracts\AiProvider`
- xAI adapter: `POST {XAI_BASE_URL}/responses` with `Authorization: Bearer $XAI_API_KEY`, `store: false`
- Default model: `grok-4.6`. Allowed: `grok-4.6`, `grok-4.5`, `grok-4.3`, `grok-build-0.1`, and `grok-4.20-*`
- Mock provider: no network; used in tests and when no key is configured

## Capability resolver

`App\Services\Ai\CapabilityResolver`

- Registers only official IDs.
- Each product (`crew_hub`, `smart_lodge`, `major_projects`) can run standalone.
- `optional_connections` in config are wiring hints, never hard dependencies.
- Titles in config are observational (this repo had no official catalog). Do not treat them as a new product list.

## Forbidden actions

`App\Services\Ai\ForbiddenActions` + `AiOutputValidator` reject assign/publish/scorecard-write/notice/overflow/payroll/auto-execute payloads even if a model emits them.

## Overtime

`App\Services\Authorization\OvertimeApprovalService`  
Gate: `approve-overtime`

Fail closed. A user is a Lodge Manager only if:

- their id is in `AI_LODGE_MANAGER_USER_IDS`, or
- their email is in `AI_LODGE_MANAGER_EMAILS`, or
- Spatie `roles` / `model_has_roles` exist and the role name is Lodge Manager

This repo has no `users.role` column. Do not invent a fourth role system.

## Scorecard

`App\Services\Scorecard\ScorecardGradeCalculator::grade()` returns the lowest applicable component. AI may explain that result only. There is no scorecard UI in this repo yet.
