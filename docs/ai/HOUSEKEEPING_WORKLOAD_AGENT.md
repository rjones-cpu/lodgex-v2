# Housekeeping Workload Agent

Wave 2 in-product agent. Class **P** (proposal / shadow) only.

Training: **LodgeX Enterprise Standard — Housekeeping & Labour Forecast Agent Rules v2.0 (20 Aug 2026)**. Section **32.1** is the system instruction (`HousekeepingLabourTrainingStandard::SYSTEM_INSTRUCTION_32_1`).

Locked module (Master Agent map, Ralph Jones approved 18 Aug 2026):

- **SL-04** Housekeeping

The training document names a child agent `SL-HK-LAB-FORECAST`. **That is not a LodgeX module ID.** Do not register it. Labour forecasting lives on **SL-11** ([LABOUR_FORECAST_AGENT.md](./LABOUR_FORECAST_AGENT.md)).

**Head Housekeeper already has the written Grok seat on SL-04.** This agent does not create a second Grok owner. Grok Bot owner on the Linear issue remains Master Agent.

Optional connection: SL-04 ↔ SL-11 only. Crew Hub and Major Projects stay behind the capability resolver.

## What it does

- Reads occupancy and departures (`rooms_old` + reservations)
- Builds a **draft clean list** versus the **active `hk_workload_rules` profile** (not hard-coded as the only truth). Project baseline examples: 29 rooms / 10 COs / 36 pts / 11 h
- Splits **forecast turnover** from **executable cleans**. Due Out that is not vacant keeps forecast turnover; executable clean is blocked
- Labels evidence: source fact / deterministic calc / assumption / recommendation. Notes, uploads, and messages are untrusted
- Creates `ai_proposals` rows with action `draft_clean_list` (decision: **approval required**)
- Optionally asks the AI runner for an explanation using the 32.1 instruction (mock in tests)

## What it must not do

Publish the HK board, approve overtime (Lodge Manager only), employment decisions, payroll, timesheet approval, reservation/room assignment, maintenance release, invent Vacant/Ready, safety/quality bypass, send guest/contractor notices, invent module IDs.

No Sleep / unused walk-down does **not** make a room Ready and does **not** release occupancy. AI is not a source of truth for room or worker status.

## Authority (training §10) for Wave 2

| Level | Wave 2 |
| --- | --- |
| 0 read/analyze | yes |
| 1 labelled drafts | yes |
| 1A auto-publish | **CONFIGURATION REQUIRED and OFF** |
| 2 OT / limit override / special-clean exception / Ready with service exception | proposal only, named human |
| 3 prohibited | refuse |

A high-confidence forecast does **not** publish a board. Lodge Manager is final operational authority. Housekeeping Supervisor controls day-to-day assignment execution **after a person approves**.

## What a person does

- **Refresh workload draft** on `/housekeeping-planning`
- **Approve** — labels the draft; **does not** call `HousekeepingAssignmentService` / publish assignments
- **Dismiss** — no ops write
- Publish the live board remains the existing human housekeeping flow (`POST /housekeeping-planning/assignments/publish`)

## UI

Shadow panel `AiHousekeepingLabourShadowPanel` on `/housekeeping-planning`. Draft workload + labour forecast. **Do not ship a live published assignment board from this agent.**

## LangSmith

Optional tracing. Project: **`lodgex-housekeeping-workload`**.

If `LANGSMITH_API_KEY` (or `LANGCHAIN_API_KEY`) is set, `AiRunner` posts provider-neutral run events. If the key is missing, tracing is skipped.

## Cloudflare MCP

Read-only stubs on `workers/lodgex-mcp/`: `get_housekeeping_workload`. Publish board / overtime / mark Ready are refused. This repo does not deploy the Worker.
