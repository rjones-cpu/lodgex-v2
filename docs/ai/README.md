# LodgeX AI

Foundation for federated AI across Crew Hub, Smart Lodge, and Major Projects.

- Assessment of this repo: [AI_REPOSITORY_ASSESSMENT.md](./AI_REPOSITORY_ASSESSMENT.md)
- How the runtime works: [FOUNDATION.md](./FOUNDATION.md)
- Reservation agent training (official standard v1.0): [RESERVATION_AGENT_TRAINING.md](./RESERVATION_AGENT_TRAINING.md)
- Room Inventory agent (SL-02 + SL-03): [ROOM_INVENTORY_INTELLIGENCE_AGENT.md](./ROOM_INVENTORY_INTELLIGENCE_AGENT.md)
- Housekeeping Workload agent (SL-04): [HOUSEKEEPING_WORKLOAD_AGENT.md](./HOUSEKEEPING_WORKLOAD_AGENT.md)
- Labour Forecast agent (SL-11): [LABOUR_FORECAST_AGENT.md](./LABOUR_FORECAST_AGENT.md)
- ADRs in this folder document decisions actually made in lodgex-v2.

## Hard rules

- AI recommends. People approve.
- AI never writes the database for high-impact ops. Approved actions go through existing LodgeX services.
- AI never assigns rooms, publishes schedules, sets/changes/suppresses a company scorecard grade, sends formal notices, or auto-executes room release / assignment publish / overflow / contractor notices.
- Do not calculate payroll or wages.
- Readiness and LMS never block sending a worker.
- Scorecard grade = lowest applicable component, never averaged. Laravel calculates.
- Schedule is always on. Timesheets, LMS, Journey Management are optional per worker.
- Bed and man-hour forecasting come from CH-03 Scheduling, not timesheets.
- Only a Lodge Manager may approve overtime (enforced in `OvertimeApprovalService` + `approve-overtime` gate).
- Official capability IDs only: CH-01–CH-11, SL-01–SL-11, MP-01–MP-09. Hierarchy is MP-09.
- Activity Director / Chef are Smart Lodge capabilities, not a fourth product.
- Default mode is shadow. Secrets stay in env (`XAI_API_KEY`).
