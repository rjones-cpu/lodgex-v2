# Labour Forecast Agent

Wave 2 in-product agent. Class **P** (proposal / shadow) only.

Training: **LodgeX Enterprise Standard — Housekeeping & Labour Forecast Agent Rules v2.0 (20 Aug 2026)**. Section **32.1** is the system instruction (`HousekeepingLabourTrainingStandard::SYSTEM_INSTRUCTION_32_1`).

Locked module (Master Agent map, Ralph Jones approved 18 Aug 2026):

- **SL-11** Labour Forecasting (& Operational Intelligence)

The training document names a child agent `SL-HK-LAB-FORECAST`. **That is not a LodgeX module ID.** Do not register it. Housekeeping workload lives on **SL-04** ([HOUSEKEEPING_WORKLOAD_AGENT.md](./HOUSEKEEPING_WORKLOAD_AGENT.md)).

Optional connection: SL-11 ↔ SL-04 only.

## What it does

- Staffing versus occupancy, housekeeping demand, and history (`HkForecast` / `ForecastSnapshot`)
- Horizons: **Today / 24h / 3d / 7d / 14d / 30d**
- **Required workers = max(minutes, points, rooms, check-outs, coverage, skill)**
- A daily average is **not** enough — Check-Out-to-Ready-Time **windows** bind
- Separate pools: attendant / inspection / laundry / public-area / special-work
- Creates `ai_proposals` rows with action `labour_forecast` (decision: **approval required**)

Reuses `HousekeepingStandardsService`, `HkWorkloadRule`, `HousekeepingForecastService` snapshots, and the SL-04 draft calculator. Does not rebuild Fusion.

## What it must not do

Approve overtime (Lodge Manager only), publish a roster or HK board, employment decisions, payroll, timesheet approval, reservation/room assignment, maintenance release, invent Vacant/Ready, send notices, invent module IDs.

Level 1A auto-publish is **CONFIGURATION REQUIRED and OFF**. A high-confidence forecast does **not** publish a board or authorize overtime.

## Authority (training §10) for Wave 2

Same matrix as Housekeeping Workload: Level 0–1 yes; Level 1A OFF; Level 2 proposal only for a named human; Level 3 refuse.

Lodge Manager is final operational authority.

## What a person does

- **Refresh labour forecast** on `/housekeeping-planning`
- **Approve** — labels the draft; does **not** authorize overtime and does **not** publish a roster
- Overtime remains `OvertimeApprovalService` (Lodge Manager)

## UI

Same shadow panel as SL-04: horizons, required vs available, shortage/surplus, readiness risk, windowed demand, pools.

## LangSmith

Optional tracing. Project: **`lodgex-labour-forecast`**. Missing `LANGSMITH_API_KEY` / `LANGCHAIN_API_KEY` = skip.

## Cloudflare MCP

Read-only stubs: `get_labour_forecast`. Overtime / publish board / mark Ready refused. This repo does not deploy the Worker.
