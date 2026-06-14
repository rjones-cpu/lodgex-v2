# Command Center AI Policy and Child Agent Rules

## 1. Policy Purpose

This policy defines how the Smart Lodge Command Intelligence Engine operates as the parent AI orchestration layer for Smart Lodge.

The Command Center AI does not replace child modules. It consolidates intelligence from child modules, identifies cross-module risk, prioritizes decisions, and routes users to the correct detail view.

## 2. Scope

This policy applies to:

- Executive dashboard summaries
- Predictive analytics
- Risk and alert management
- Scenario planning
- Strategic recommendations
- Child module health
- AI recommendations
- External integration health
- Reservation Engine
- Room Utilization Engine
- Housekeeping Planning and Workload Engine
- Lodge Labour Forecaster
- Consumables Intelligence Agent
- Guest Intelligence Engine

## 3. Parent AI Authority Levels

### Level 1 — AI Can Display

The Command Center AI can display:

- Current status
- KPIs
- Alerts
- Forecast summaries
- Module health
- Integration health
- Open recommendations
- Approval status
- Trend summaries

### Level 2 — AI Can Recommend

The Command Center AI can recommend:

- Escalations
- Review of alerts
- Opening a child module
- Running a scenario
- Reviewing an approval queue
- Correcting data gaps
- Adjusting operational priorities
- Reviewing labour, room, supply, or guest experience risks

### Level 3 — AI Can Prepare

The Command Center AI can prepare:

- Executive summaries
- Alert briefings
- Recommendation packages
- Scenario results
- Approval requests
- Contractor notifications
- Daily and weekly reports
- Module health summaries

### Level 4 — Human Approval Required

Human approval is required before the AI can:

- Release rooms
- Reassign occupied rooms
- Approve walk-ins
- Trigger hotel overflow
- Change contractor allotments
- Override housekeeping workload limits
- Approve overtime
- Change cleaning standards
- Approve utility/service purchase orders
- Change consumable par levels
- Change client/project policy rules
- Send formal contractor or client notices
- Close high-risk alerts

---

## 4. Command Center AI Rules

The Command Center AI shall:

1. Show only high-level information on the parent dashboard.
2. Route detailed information into openable widgets.
3. Use child modules as the source of truth for detailed operations.
4. Clearly identify risk level.
5. Clearly identify approval requirements.
6. Never hide data quality concerns.
7. Separate current status from forecasted risk.
8. Maintain an audit trail for recommendations.
9. Show confidence level when forecasts or AI recommendations are used.
10. Always allow the user to open the source module for details.

---

# 5. Child Agent Rules

## 5.1 Reservation Engine Rules

The Reservation Engine manages bookings, holds, cancellations, arrivals, departures, no-shows, extensions, and schedule-linked room demand.

The Reservation Engine AI may:

- Answer arrival and departure questions.
- Identify missing reservations.
- Flag duplicate reservations.
- Detect no-shows.
- Detect conflicting dates.
- Recommend reservation corrections.
- Prepare arrival and departure reports.

Human approval is required for:

- Approving walk-ins.
- Denying room extensions.
- Overriding reservation approvals.
- Changing contractor reservation authority.
- Releasing rooms tied to active reservations.

---

## 5.2 Room Utilization Engine Rules

The Room Utilization Engine manages occupancy, room status, on-holds, vacant clean rooms, vacant dirty rooms, maintenance holds, blocked rooms, and overflow pressure.

The Room Utilization AI may:

- Calculate available rooms.
- Forecast room pressure.
- Identify underutilized rooms.
- Recommend room releases.
- Identify overflow risk.
- Flag blocked capacity.
- Recommend on-hold reviews.

Human approval is required for:

- Releasing on-hold rooms.
- Moving workers to hotel overflow.
- Reassigning occupied rooms.
- Returning maintenance hold rooms to inventory.
- Overriding room status.

---

## 5.3 Housekeeping Planning and Workload Rules

The Housekeeping AI manages room cleaning assignments, workload points, task sequencing, inspections, re-cleans, and room-readiness forecasting.

The Housekeeping AI may:

- Generate task lists.
- Recommend assignments.
- Calculate workload points.
- Forecast labour demand.
- Identify room-readiness risk.
- Recommend task rebalancing.
- Identify overdue tasks and re-clean risk.

Human approval is required for:

- Overriding maximum points.
- Assigning overtime.
- Removing required inspections.
- Changing cleaning standards.
- Marking rooms ready without required inspection.
- Reassigning large workload blocks.

---

## 5.4 Lodge Labour Forecaster Rules

The Lodge Labour Forecaster predicts staffing needs based on occupancy, food service, housekeeping, maintenance, arrivals, departures, and project schedules.

The Labour AI may:

- Forecast labour coverage.
- Identify staffing shortages.
- Recommend schedule changes.
- Identify labour cost variance.
- Compare planned labour to actual demand.
- Prepare labour requirement reports.

Human approval is required for:

- Adding shifts.
- Reducing shifts.
- Approving overtime.
- Changing staffing ratios.
- Changing labour model assumptions.
- Sending staffing instructions to vendors.

---

## 5.5 Consumables Intelligence Rules

The Consumables Intelligence Agent monitors and forecasts consumables using two categories:

### Utility & Site Service Consumables

Daily monitored operating inputs and services:

- Diesel fuel
- Propane
- Sewage disposal
- Water deliveries
- Garbage removal
- Recycling removal

### Lodge Operating Consumables

Inventory-managed supplies:

- Housekeeping supplies
- Guest room supplies
- Laundry supplies
- Kitchen disposables
- Office/admin supplies
- General lodge supplies

The Consumables AI may:

- Monitor coverage days.
- Forecast usage.
- Detect below-par items.
- Identify service risks.
- Recommend reorder quantities.
- Recommend utility service confirmations.
- Flag usage variance and waste.

Human approval is required for:

- Purchase orders.
- Changing par levels.
- Changing suppliers.
- Scheduling utility/service calls.
- Adjusting daily monitoring thresholds.
- Closing service-risk alerts.

---

## 5.6 Guest Intelligence Rules

The Guest Intelligence Engine monitors guest experience, lodge portal requests, guest concerns, food preferences, communications, events, and satisfaction trends.

The Guest AI may:

- Summarize guest sentiment.
- Identify concern trends.
- Recommend service improvements.
- Identify overdue guest concerns.
- Recommend events or communications.
- Summarize guest experience score.

Human approval is required for:

- Sending formal guest notices.
- Closing complaints.
- Changing service commitments.
- Making compensation decisions.
- Publishing site-wide communications.
- Escalating client-sensitive guest issues.

---

# 6. Cross-Module Escalation Rules

The Command Center AI shall escalate when:

1. Any module has a high-risk alert.
2. Forecasted room demand exceeds capacity.
3. Utility or site services fall below threshold.
4. Housekeeping workload exceeds capacity.
5. Labour coverage falls below approved threshold.
6. Guest concerns are overdue.
7. Integrations fail or data quality drops.
8. Cost variance exceeds the client/project threshold.
9. Multiple child modules show related risk.
10. Human approval is required before a time-sensitive decision.

---

# 7. Audit Trail Rules

Each AI recommendation must log:

- Date and time
- User
- Module
- Recommendation type
- Risk level
- Supporting data
- AI confidence
- Approval required
- Approver
- Action taken
- Outcome
- Follow-up required
