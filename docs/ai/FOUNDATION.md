# AI foundation

## Runtime

```
Controller / Agent
    → CapabilityResolver (official IDs only; products standalone)
    → AiFeatureFlags (default mode=shadow; off | shadow | supervised)
    → AiRunner → LangSmithTracer (optional) → AiProviderRegistry → MockProvider | XaiProvider
    → AiOutputValidator (blocks forbidden actions)
    → AiAuditLogger (no secrets)
    → AiProposal (pending) → human Approve/Dismiss
    → existing service (e.g. RoomAssignmentService::assign)
```

Config: `config/ai.php`  
Env: see `.env.example` (`AI_MODE=shadow`, `AI_PROVIDER=xai`, `XAI_API_KEY=`)  
Tests force `AI_PROVIDER=mock` in `phpunit.xml`.

Wave 1 agent: Room Inventory Intelligence on **SL-02 + SL-03**, class P. Training: [RESERVATION_AGENT_TRAINING.md](./RESERVATION_AGENT_TRAINING.md). Agent: [ROOM_INVENTORY_INTELLIGENCE_AGENT.md](./ROOM_INVENTORY_INTELLIGENCE_AGENT.md).

Wave 2 agents: Housekeeping Workload on **SL-04** and Labour Forecast on **SL-11**, class P. Training: Housekeeping & Labour Forecast Agent Rules v2.0 (20 Aug 2026), section **32.1**. Agents: [HOUSEKEEPING_WORKLOAD_AGENT.md](./HOUSEKEEPING_WORKLOAD_AGENT.md), [LABOUR_FORECAST_AGENT.md](./LABOUR_FORECAST_AGENT.md). Auto-publish (Level 1A) is OFF. Do not register `SL-HK-LAB-FORECAST` as a module.

## Turn the flag on

Shadow is already the default (`AI_ENABLED=true`, `AI_MODE=shadow`).

1. Copy `.env.example` keys into `.env` (never commit a real key).
2. Set `XAI_API_KEY` from the xAI console.
3. Set `AI_PROVIDER=xai` (already the non-test default). If the key is empty, the registry falls back to `mock`.
4. Optional: `AI_DEFAULT_MODEL=grok-4.6` (official slugs only).
5. Optional: `AI_ROOM_INVENTORY_AGENT=true` (default true).
5b. Optional: `AI_HOUSEKEEPING_WORKLOAD_AGENT=true` and `AI_LABOUR_FORECAST_AGENT=true` (default true).
6. Run `php artisan migrate` for `ai_proposals`, `ai_proposal_audit_logs`, `ai_audit_logs`.
7. Open `/dashboard`, `/room-inventory`, or `/modules/reservations` for Room Inventory Intelligence. Open `/housekeeping-planning` for Housekeeping Workload (SL-04) and Labour Forecast (SL-11).

`AI_MODE=off` disables generation. `AI_MODE=supervised` (Wave 0 alias: `propose`) is the same write policy as shadow: AI still cannot assign; humans still use `RoomAssignmentService::assign`.

## Providers

- Interface: `App\Services\Ai\Contracts\AiProvider`
- xAI adapter: `POST {XAI_BASE_URL}/responses` with `Authorization: Bearer $XAI_API_KEY`, `store: false`
- Default model: `grok-4.6`. Allowed: `grok-4.6`, `grok-4.5`, `grok-4.3`, `grok-build-0.1`, and `grok-4.20-*`
- Mock provider: no network; used in tests and when no key is configured

## LangSmith

LangSmith is the agent-management / tracing system. There is no project named `lodgex`. Wave 1 traces to **`lodgex-room-inventory-intelligence`**. Wave 2 traces to **`lodgex-housekeeping-workload`** (SL-04) and **`lodgex-labour-forecast`** (SL-11).

`App\Services\Ai\LangSmithTracer` is a small HTTP wrapper around `AiRunner` (provider-neutral, no PHP LangSmith SDK).

| Env | Purpose |
| --- | --- |
| `LANGSMITH_API_KEY` or `LANGCHAIN_API_KEY` | Enable tracing. Missing = skip. |
| `LANGSMITH_PROJECT` or `LANGCHAIN_PROJECT` | Default project (this agent overrides to `lodgex-room-inventory-intelligence`) |
| `LANGSMITH_ENDPOINT` or `LANGCHAIN_ENDPOINT` | Default `https://api.smith.langchain.com` |
| `LANGSMITH_TRACING` or `LANGCHAIN_TRACING_V2` | Set false to disable even when a key is present |

Never required at runtime. Fail-soft: tracing errors are swallowed.

## Cloudflare MCP

Worker source lives in `workers/lodgex-mcp/` (no separate repo). Read-only tools call `/api/ai/room-inventory/*` with `LODGEX_MCP_TOKEN`. Set `LODGEX_API_BASE` on the Worker. Do not deploy from the app PR unless wrangler is already set up and safe.

## Capability resolver

`App\Services\Ai\CapabilityResolver`

- Registers only official IDs (Master Agent locked map).
- Each product (`crew_hub`, `smart_lodge`, `major_projects`) can run standalone.
- `optional_connections` in config are wiring hints, never hard dependencies.
- Titles come from the Master Agent map. SL-01 is Lodge Executive Brief, not this agent.

## Forbidden actions

`App\Services\Ai\ForbiddenActions` + `AiOutputValidator` reject assign/hold/release/check-in/write-occupancy/publish/scorecard-write/notice/overflow/payroll/auto-execute/overbook/displace/life-safety/No-Sleep-release payloads even if a model emits them. Proposal `decision` cannot be execute.

## Overtime

`App\Services\Authorization\OvertimeApprovalService`  
Gate: `approve-overtime`

Fail closed. A user is a Lodge Manager only if:

- their id is in `AI_LODGE_MANAGER_USER_IDS`, or
- their email is in `AI_LODGE_MANAGER_EMAILS`, or
- Spatie `roles` / `model_has_roles` exist and the role name is Lodge Manager

This repo has no `users.role` column. Do not invent a fourth role system.

## Scorecard

`App\Services\Scorecard\ScorecardGradeCalculator::grade()` returns the lowest applicable component. AI may explain that result only. Official ID is **CH-11** (Service Rating). There is no scorecard UI in this repo yet.
