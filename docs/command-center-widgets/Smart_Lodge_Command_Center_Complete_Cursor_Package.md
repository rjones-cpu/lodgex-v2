# Smart Lodge Command Center — Complete Cursor Markdown Package



---

<!-- FILE: 01_Command_Center_AI_Policy_and_Rules.md -->

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


---

<!-- FILE: 02_Parent_Dashboard_Design_System.md -->

# Parent Dashboard Design System

## Design Goal

The Smart Lodge Command Intelligence Engine should feel like an executive command center, not a dense operational spreadsheet.

The parent page should show summarized widgets. Each widget opens detailed information through a dedicated page, drawer, modal, or tab view.

## Visual Style

### Colours

```text
Primary Navy: #061A3A
Command Blue: #0B5ED7
Light Background: #F5F8FC
Card White: #FFFFFF
Border: #D8E2F0
Text Dark: #102033
Text Muted: #667085
Success Green: #0F7B4F
Warning Amber: #F59E0B
Risk Red: #DC2626
Guest Purple: #4B2495
Consumables Teal: #008C8C
```

### Cards

Use:

- 16px to 20px rounded corners
- Light border
- Soft shadow
- Consistent padding
- Centered KPI values
- Left-aligned labels
- Clear call-to-action button
- Icon in a soft badge

### Typography

```text
Page title: 32px to 40px, bold
Section title: 20px to 24px, semibold
Card title: 15px to 18px, semibold
KPI value: 28px to 36px, bold
Body text: 13px to 15px
Micro text: 11px to 12px
```

## Parent Dashboard Grid

Recommended desktop layout:

```text
Header
Command Summary Row
KPI Snapshot Row
Risk / Recommendations / Module Health / Integration Health
Child Module Cards
```

## Widget Open Behaviour

Each widget should have:

```text
id
title
status
primaryValue
secondaryText
riskLevel
icon
accentColor
ctaLabel
targetRoute
```

## Example Widget Object

```json
{
  "id": "risk-alert-management",
  "title": "Risk & Alert Management",
  "status": "4 Open Alerts",
  "primaryValue": "4 Open Alerts",
  "secondaryText": "1 high priority",
  "riskLevel": "high",
  "icon": "AlertTriangle",
  "accentColor": "red",
  "ctaLabel": "Open Alerts",
  "targetRoute": "/command-center/alerts"
}
```

## Widget Button Labels

Use action labels that match the purpose:

- Executive Dashboards: `Open`
- Predictive Analytics: `View Details`
- Risk & Alert Management: `Open Alerts`
- Scenario Planning: `Explore`
- Strategic Recommendations: `View Details`
- Command AI Recommendations: `Review All`
- Child Module Intelligence: `View Module Health`
- External Integration Health: `View All Integrations`
- Child modules: `Open Module`

## Responsive Behaviour

On desktop:

- Use 5 summary widgets across the top.
- Use 8 KPI cards in one row or two rows.
- Use 4 operational cards in a grid.
- Use child module cards in a 6-column or 3-column grid.

On tablet:

- Use 2 to 3 columns.

On mobile:

- Use one column with sticky search and filter controls.


---

<!-- FILE: 03_Executive_Dashboards_Widget.md -->

# Executive Dashboards Widget

## Route

```text
/command-center/executive-dashboards
```

## Widget Purpose

The Executive Dashboards widget provides leadership with a quick view of lodge performance, operational health, guest experience, cost signals, and module status.

## Parent Dashboard Widget

The parent dashboard card should show only summary-level information and a clear action button.

## Openable Detail View

When the user opens this widget, show a dedicated detail view with the following sections:


1. Executive KPI Overview
2. Occupancy Summary
3. Labour and Housekeeping Summary
4. Utility and Consumables Summary
5. Guest Experience Summary
6. Cost and Resource Summary
7. Weekly Executive Report
8. Exportable Report Section


## Sample Data


```text
Status: Active
Dashboards Reporting: 3
Last Updated: 2 minutes ago
Open Executive Items: 4
```


## AI Policy Rules

The AI may:

- Summarize the current status.
- Identify risk and trends.
- Recommend next actions.
- Show confidence levels where forecasts are used.
- Route the user to the correct child module.

The AI must request human approval before applying changes that affect operations, cost, staffing, room assignments, service schedules, supplier orders, or client/project rules.

## Cursor Build Requirements


Build a dashboard page with executive cards, trend summaries, and links to module-level reports. Include filters for lodge, client, project, and date range. Add an export report button.



---

<!-- FILE: 04_Predictive_Analytics_Widget.md -->

# Predictive Analytics Widget

## Route

```text
/command-center/predictive-analytics
```

## Widget Purpose

The Predictive Analytics widget forecasts occupancy, housekeeping workload, labour demand, utility service risk, lodge supply coverage, guest concern trends, and cost variance.

## Parent Dashboard Widget

The parent dashboard card should show only summary-level information and a clear action button.

## Openable Detail View

When the user opens this widget, show a dedicated detail view with the following sections:


1. Occupancy Forecast
2. Housekeeping Workload Forecast
3. Labour Demand Forecast
4. Utility Service Forecast
5. Lodge Supply Forecast
6. Guest Concern Trend
7. Cost and Resource Forecast
8. Forecast Confidence and Data Quality


## Sample Data


```text
Status: Active
7-Day Forecast Updated
Forecast Confidence: 87%
Data Quality: Good
Highest Risk Date: Monday
```


## AI Policy Rules

The AI may:

- Summarize the current status.
- Identify risk and trends.
- Recommend next actions.
- Show confidence levels where forecasts are used.
- Route the user to the correct child module.

The AI must request human approval before applying changes that affect operations, cost, staffing, room assignments, service schedules, supplier orders, or client/project rules.

## Cursor Build Requirements


Build charts for 7-day, 14-day, and 30-day forecasts. Include forecast confidence, data quality, and alert markers on high-risk dates. Use clean chart cards with summary text beside each chart.



---

<!-- FILE: 05_Risk_Alert_Management_Widget.md -->

# Risk & Alert Management Widget

## Route

```text
/command-center/alerts
```

## Widget Purpose

The Risk & Alert Management widget centralizes operational risks from all child modules. The parent widget should show only open alert counts and the highest priority risk. The detail page should show a structured alert work queue.

## Parent Dashboard Widget

```text
Title: Risk & Alert Management
Value: 4 Open Alerts
Subtext: 1 high priority
Button: Open Alerts
```

## Important Layout Rule

Alert rows must have enough height and padding so text does not sit too close to the bottom border.

Recommended row design:

```text
min-height: 76px
padding: 16px 20px
display: flex
align-items: center
gap: 18px
line-height: 1.35
```

Use a compact layout only on the parent dashboard. Use the full expanded alert layout on the detail page.

## Openable Detail View Sections

1. Alert Summary
2. Open Alerts
3. Alert Detail Panel
4. Affected Modules
5. Recommended Actions
6. Approval Required
7. Decision Deadline
8. Alert History
9. Closed Alerts
10. Escalation Rules

## Alert Categories

- Capacity risk
- Room availability risk
- Housekeeping workload risk
- Labour shortage risk
- Utility and site service risk
- Lodge supply risk
- Guest concern risk
- Cost variance risk
- Data quality risk
- Integration failure risk

## Sample Alert Rows

```text
HIGH
Monday Capacity Pressure
Projected shortage of 8 rooms. Review releasable on-holds and dirty-room turnover.

MEDIUM
Utility & Site Service Risk
Diesel fuel and sewage disposal projected below threshold within 72 hours.

MEDIUM
Housekeeping Workload Spike
Tuesday workload forecast exceeds capacity by 18 points.

LOW
Data Quality Warning
2 contractor schedules have missing departure data.
```

## Expanded Alert Card Format

```text
Risk Level:
Alert Title:
Description:
Affected Module:
Supporting Data:
Recommended Action:
Approval Required:
Decision Required By:
AI Confidence:
Status:
```

## AI Policy Rules

The AI may:

- Display alerts.
- Rank alerts by urgency.
- Recommend next actions.
- Identify affected modules.
- Prepare escalation summaries.
- Prepare approval requests.

The AI must not:

- Close high-risk alerts without approval.
- Apply operational changes without approval.
- Hide alerts caused by poor data quality.
- Trigger supplier, contractor, or client notifications without approval.

## Cursor Build Requirements

Build a clean alert management page with:

- Alert tabs: All, High, Medium, Low, Utility Services, Capacity, Labour, Guest, Data
- A left alert list
- A right alert detail drawer or panel
- Clear approval required badges
- Decision deadline field
- Open module link for each affected module
- Alert audit history


---

<!-- FILE: 06_Scenario_Planning_Widget.md -->

# Scenario Planning Widget

## Route

```text
/command-center/scenario-planning
```

## Widget Purpose

The Scenario Planning widget allows users to test what-if conditions before making operational decisions.

## Parent Dashboard Widget

The parent dashboard card should show only summary-level information and a clear action button.

## Openable Detail View

When the user opens this widget, show a dedicated detail view with the following sections:


1. Quick Scenarios
2. Scenario Builder
3. Input Controls
4. Impact Summary
5. Risk Level
6. Recommended Action
7. Approval Required
8. Saved Scenarios
9. Scenario History


## Sample Data


```text
Status: Ready
Saved Scenarios: 3
Quick Scenarios:
- Add 20 arrivals
- Release 10 on-holds
- 1 housekeeper absent
- Hotel unavailable
```


## AI Policy Rules

The AI may:

- Summarize the current status.
- Identify risk and trends.
- Recommend next actions.
- Show confidence levels where forecasts are used.
- Route the user to the correct child module.

The AI must request human approval before applying changes that affect operations, cost, staffing, room assignments, service schedules, supplier orders, or client/project rules.

## Cursor Build Requirements


Build a scenario planning page with adjustable inputs for arrivals, delayed departures, released on-holds, maintenance rooms, housekeepers available, hotel rooms available, utility deliveries, and supply levels. Show impact cards for rooms, labour, cost, guest impact, and utility/service risk.



---

<!-- FILE: 07_Strategic_Recommendations_Widget.md -->

# Strategic Recommendations Widget

## Route

```text
/command-center/strategic-recommendations
```

## Widget Purpose

The Strategic Recommendations widget shows AI-generated opportunities to improve room utilization, reduce cost, improve service, correct data issues, and protect lodge continuity.

## Parent Dashboard Widget

The parent dashboard card should show only summary-level information and a clear action button.

## Openable Detail View

When the user opens this widget, show a dedicated detail view with the following sections:


1. Recommendation Queue
2. Business Value Summary
3. Risk Reduction Summary
4. Cost Savings Estimate
5. Affected Modules
6. Approval Requirements
7. Recommendation Status
8. Action History


## Sample Data


```text
Status: 6 Recommendations
Require Approval: 2
Top Recommendation: Release unused on-hold rooms
Estimated Value: Avoid hotel overflow
```


## AI Policy Rules

The AI may:

- Summarize the current status.
- Identify risk and trends.
- Recommend next actions.
- Show confidence levels where forecasts are used.
- Route the user to the correct child module.

The AI must request human approval before applying changes that affect operations, cost, staffing, room assignments, service schedules, supplier orders, or client/project rules.

## Cursor Build Requirements


Build recommendation cards with title, category, business impact, expected benefit, confidence, approval required, and buttons for Review, Prepare Action, Approve, Dismiss, and Open Module.



---

<!-- FILE: 08_Command_AI_Recommendations_Widget.md -->

# Command AI Recommendations Widget

## Route

```text
/command-center/ai-recommendations
```

## Widget Purpose

The Command AI Recommendations widget is the parent-level review queue for AI-generated actions across the entire lodge.

## Parent Dashboard Widget

```text
Title: Command AI Recommendations
Top Items:
- Release 8 on-hold rooms
- Confirm utility service schedule
- Rebalance housekeeping workload
Button: Review All
```

## Openable Detail View Sections

1. Recommendation Inbox
2. Urgent Recommendations
3. Capacity Recommendations
4. Labour Recommendations
5. Guest Experience Recommendations
6. Consumables Recommendations
7. Cost Recommendations
8. Data Quality Recommendations
9. Approval Queue
10. Actioned Recommendations

## Recommendation Categories

- Capacity
- Housekeeping
- Labour
- Utility & Site Services
- Lodge Supplies
- Guest Experience
- Cost
- Data Quality
- Integration Health

## Recommendation Statuses

```text
New
Under Review
Approved
Actioned
Dismissed
Escalated
Waiting for Approval
```

## Recommendation Card Format

```text
Risk Level:
Recommendation Title:
Description:
AI Reasoning:
Affected Modules:
Business Value:
Confidence:
Approval Required:
Recommended Next Step:
```

## Sample Recommendations

```text
High
Release 8 on-hold rooms
Avoid hotel overflow and recover capacity.
Approval: WFA Coordinator

Medium
Confirm utility service schedule
Validate diesel, propane, water, sewage, garbage, and recycling services daily.
Approval: Lodge Manager / Maintenance Lead

Medium
Prioritize 5 vacant dirty rooms
Protect same-day arrivals and improve readiness.
Approval: Lodge Manager

Low
Correct schedule gaps
Improve forecast confidence from 87% to 93%.
Approval: Contractor Admin
```

## AI Policy Rules

The AI may prepare recommendations and supporting data.

The AI must request approval before:

- Releasing rooms.
- Changing staffing.
- Scheduling utility services.
- Creating purchase orders.
- Sending contractor notices.
- Updating client/project rules.
- Closing risk alerts.

## Cursor Build Requirements

Build a recommendation review center with filters, tabs, cards, approval buttons, and module links. Each recommendation should have an expandable detail area showing supporting data and audit history.


---

<!-- FILE: 09_Child_Module_Intelligence_Widget.md -->

# Child Module Intelligence Widget

## Route

```text
/command-center/module-health
```

## Widget Purpose

The Child Module Intelligence widget shows health and status across all child modules. It helps leaders see which modules are active, warning, delayed, or failing.

## Parent Dashboard Widget

```text
Title: Child Module Intelligence
Status: 7 Modules Active
Warnings: 0 to 2
Health Score: 98%
Button: View Module Health
```

## Child Modules

1. Reservation Engine
2. Room Utilization
3. Housekeeping Planning & Workload
4. Lodge Labour Forecaster
5. Consumables Intelligence
6. Guest Intelligence
7. External Integration Layer, if displayed as a support module

## Openable Detail View Sections

1. Module Health Summary
2. Module Status Cards
3. Open Risks by Module
4. AI Recommendations by Module
5. Sync Status
6. Data Quality Score
7. Last Updated Timestamp
8. Module Dependency Map
9. Audit and Error Logs

## Module Status Values

```text
Active
Warning
At Risk
Disconnected
Syncing
Needs Review
```

## Sample Module Card

```text
Consumables Intelligence
Status: Warning
Utility service coverage: 3.2 days
Lodge supply coverage: 12.5 days
AI recommendations: 4
Open module
```

## AI Policy Rules

The AI may:

- Summarize module health.
- Detect cross-module risk.
- Recommend opening affected modules.
- Prepare module health reports.

The AI must not:

- Override child module rules.
- Hide disconnected integrations.
- Mark module health as resolved without validation.

## Cursor Build Requirements

Build a module health dashboard with module cards, health badges, dependency indicators, warning counts, and open-module buttons.


---

<!-- FILE: 10_External_Integration_Health_Widget.md -->

# External Integration Health Widget

## Route

```text
/command-center/integrations
```

## Widget Purpose

The External Integration Health widget monitors whether key external systems are connected, syncing, and providing reliable data.

## Parent Dashboard Widget

```text
Title: External Integration Health
Status: Connected
Systems:
- Property Management System
- Finance / ERP
- Supplier Network
Button: View All Integrations
```

## Integration Categories

### Workforce and Schedule Systems

- Individual Company Schedule Systems
- Major Projects Master Schedule
- LodgeX Worker App
- External Data Sources

### Enterprise Systems

- Finance / ERP
- Reporting systems
- Supplier network
- API / REST services
- Secure webhooks
- SFTP / file exchange
- SQL / database connectors

## Openable Detail View Sections

1. Integration Summary
2. Connected Systems
3. Sync Status
4. Last Sync Time
5. Records Received
6. Records Sent
7. Data Quality Score
8. Failed Syncs
9. Retry Queue
10. Integration Error Logs

## Status Values

```text
Connected
Syncing
Warning
Failed
Disconnected
Delayed
```

## AI Policy Rules

The AI may:

- Detect sync issues.
- Flag stale data.
- Recommend a data quality review.
- Prepare integration issue summaries.

The AI must not:

- Change integration credentials.
- Disable integrations.
- Push data to external systems without configured authorization.
- Hide integration failures.

## Cursor Build Requirements

Build an integration health page with system cards, data quality scores, last sync times, error logs, and retry status.


---

<!-- FILE: 11_Reservation_Engine_Widget.md -->

# Reservation Engine Widget

## Route

```text
/modules/reservations
```

## Widget Purpose

The Reservation Engine manages bookings, holds, cancellations, arrivals, departures, room extensions, no-shows, and schedule-linked demand.

## Parent Dashboard Card

```text
Title: Reservation Engine
Status: Active
Summary: Manage bookings, holds, and availability
Button: Open Module
```

## Openable Module Sections

1. Arrival List
2. Departure List
3. Reservations Calendar
4. Pending Reservations
5. No-Show Review
6. Room Extension Requests
7. Duplicate Reservations
8. Contractor Reservation Summary
9. Approval Queue
10. Reservation Audit Log

## AI Rules

The Reservation AI may:

- Identify arrivals and departures.
- Find missing reservations.
- Flag duplicates.
- Flag no-shows.
- Recommend follow-up messages.
- Prepare daily arrival and departure reports.

Human approval is required for:

- Approving walk-ins.
- Denying extensions.
- Overriding approval status.
- Releasing rooms tied to active reservations.
- Sending formal contractor notices.

## Cursor Build Requirements

Build a reservations module page with arrival/departure tables, filters by contractor/project/date, no-show queue, extension approval queue, and AI recommendation panel.


---

<!-- FILE: 12_Room_Utilization_Widget.md -->

# Room Utilization Widget

## Route

```text
/modules/room-utilization
```

## Widget Purpose

The Room Utilization module tracks room status, occupancy, on-holds, room availability, maintenance holds, vacant rooms, and overflow risk.

## Parent Dashboard Card

```text
Title: Room Utilization
Status: Active or Warning
Summary: Track occupancy, turnover, and room performance
Button: Open Module
```

## Openable Module Sections

1. Room Status Board
2. Occupancy Dashboard
3. Available Rooms
4. On-Hold Review
5. Maintenance Hold Impact
6. Release Candidate List
7. Overflow Forecast
8. Contractor Utilization
9. Dorm Utilization
10. Room Status Audit Log

## AI Rules

The Room Utilization AI may:

- Calculate available rooms.
- Forecast capacity pressure.
- Identify release candidates.
- Identify underutilized rooms.
- Flag blocked capacity.
- Recommend overflow review.
- Recommend on-hold release review.

Human approval is required for:

- Releasing on-hold rooms.
- Reassigning occupied rooms.
- Moving workers to hotel overflow.
- Returning maintenance rooms to service.
- Overriding room status.

## Cursor Build Requirements

Build a room utilization module page with status cards, room grid, on-hold queue, release candidate table, capacity forecast chart, and approval workflow.


---

<!-- FILE: 13_Housekeeping_Planning_Workload_Widget.md -->

# Housekeeping Planning & Workload Widget

## Route

```text
/modules/housekeeping-workload
```

## Widget Purpose

The Housekeeping Planning & Workload module converts room status, arrivals, departures, stayovers, on-hold dirty rooms, labour capacity, and cleaning standards into daily assignments and workload forecasts.

## Parent Dashboard Card

```text
Title: Housekeeping Planning & Workload
Status: Active
Summary: Plan schedules, assignments, and workload balance
Button: Open Module
```

## Openable Module Sections

1. Daily Assignment Board
2. Housekeeper Workload Cards
3. Unassigned Rooms
4. Rooms Required for Arrival
5. Workload Points Summary
6. Check-Out Count Summary
7. Inspection and Re-Clean Board
8. Labour Shortage Alerts
9. Room Readiness Forecast
10. Productivity Report

## AI Rules

The Housekeeping AI may:

- Generate daily tasks.
- Calculate workload points.
- Recommend assignments.
- Sequence priority rooms.
- Flag workload overload.
- Forecast labour demand.
- Identify room-readiness risk.

Human approval is required for:

- Overriding max points.
- Assigning overtime.
- Removing required inspections.
- Changing cleaning standards.
- Marking rooms ready without required inspection.
- Reassigning large workload blocks.

## Configurable Rules

- Maximum points per day.
- Maximum rooms per day.
- Maximum checkouts per day.
- Maximum hours per day.
- Task time standards.
- Task point values.
- Inspection requirements.
- Dorm assignment rules.
- Travel time rules.

## Cursor Build Requirements

Build a housekeeping workload module with drag-and-drop assignments, points totals, room lists, task statuses, readiness risk, inspection board, and print/export task sheet.


---

<!-- FILE: 14_Lodge_Labour_Forecaster_Widget.md -->

# Lodge Labour Forecaster Widget

## Route

```text
/modules/labour-forecaster
```

## Widget Purpose

The Lodge Labour Forecaster predicts staffing demand based on occupancy, arrivals, departures, housekeeping workload, food service demand, maintenance needs, guest requests, and project schedules.

## Parent Dashboard Card

```text
Title: Lodge Labour Forecaster
Status: Active
Summary: Forecast demand, coverage, and staffing needs
Button: Open Module
```

## Openable Module Sections

1. Labour Coverage Summary
2. Forecasted Staffing Demand
3. Role-Based Staffing Needs
4. Shift Coverage
5. Labour Shortage Alerts
6. Overtime Risk
7. Vendor Staffing Report
8. Labour Cost Forecast
9. Labour Versus Occupancy Trend
10. Forecast Accuracy

## AI Rules

The Labour AI may:

- Forecast staffing demand.
- Identify role shortages.
- Recommend schedule review.
- Flag overtime risk.
- Compare planned labour to actual demand.
- Prepare labour reports.

Human approval is required for:

- Adding shifts.
- Reducing shifts.
- Approving overtime.
- Changing staffing ratios.
- Sending staffing requests to vendors.
- Changing labour forecast rules.

## Cursor Build Requirements

Build a labour forecasting dashboard with charts, role cards, shortage alerts, staffing ratio controls, cost forecast, and approval workflow.


---

<!-- FILE: 15_Consumables_Intelligence_Widget.md -->

# Consumables Intelligence Widget

## Route

```text
/modules/consumables
```

## Widget Purpose

The Consumables Intelligence module tracks, forecasts, and controls consumable inventory and utility/site service usage across the lodge.

It is split into two categories:

1. Utility & Site Service Consumables
2. Lodge Operating Consumables

## Parent Dashboard Card

```text
Title: Consumables Intelligence
Status: Active or Warning
Summary: Monitor supplies, inventory, and reorder planning
Button: Open Module
```

## KPI Widgets

### Utility Services

```text
Title: Utility Services
Value: 3.2 days
Subtext: Fuel + sewage risk
```

### Lodge Supplies

```text
Title: Lodge Supplies
Value: 12.5 days
Subtext: 4 below par
```

## Openable Module Sections

1. Utility & Site Service Dashboard
2. Lodge Operating Supplies Dashboard
3. Daily Utility Monitoring
4. Inventory Status
5. Below-Par Items
6. Reorder Recommendations
7. Purchase Order Recommendations
8. Supplier Performance
9. Usage Variance
10. Cost Forecast
11. Waste and Shrinkage
12. Service Schedule Validation

## Utility & Site Service Consumables

These are monitored daily:

- Diesel fuel
- Propane
- Sewage disposal
- Water deliveries
- Garbage removal
- Recycling removal

## Lodge Operating Consumables

These are inventory-controlled:

- Housekeeping supplies
- Guest room supplies
- Laundry supplies
- Kitchen disposables
- Office/admin supplies
- General lodge supplies

## AI Rules

The Consumables AI may:

- Forecast usage.
- Calculate coverage days.
- Identify below-par items.
- Recommend reorder quantities.
- Flag service risks.
- Flag supplier delays.
- Flag waste or usage variance.
- Prepare purchase recommendations.

Human approval is required for:

- Purchase orders.
- Changing par levels.
- Changing suppliers.
- Scheduling service calls.
- Closing utility service risk alerts.
- Changing client/project thresholds.

## Cursor Build Requirements

Build a consumables module with two tabs: Utility & Site Services and Lodge Operating Consumables. Include daily monitoring, coverage days, reorder queue, supplier performance, usage variance, PO recommendation flow, and approval workflow.


---

<!-- FILE: 16_Guest_Intelligence_Widget.md -->

# Guest Intelligence Widget

## Route

```text
/modules/guest-intelligence
```

## Widget Purpose

The Guest Intelligence module tracks guest experience, lodge portal activity, guest concerns, communications, events, food preferences, and service trends.

## Parent Dashboard Card

```text
Title: Guest Intelligence
Status: Active
Summary: Guest insights, preferences, and experience analytics
Button: Open Module
```

## Openable Module Sections

1. Guest Experience Score
2. Open Guest Concerns
3. Overdue Concerns
4. Lodge Portal Requests
5. Food Preference Signals
6. Communication Summary
7. Event Participation
8. Guest Sentiment Trends
9. Service Improvement Recommendations
10. Guest Experience Reports

## AI Rules

The Guest AI may:

- Summarize guest sentiment.
- Identify complaint trends.
- Recommend service improvements.
- Flag overdue concerns.
- Recommend communication drafts.
- Identify food preference trends.
- Prepare guest experience reports.

Human approval is required for:

- Sending formal guest communications.
- Closing complaints.
- Making compensation decisions.
- Publishing site-wide notices.
- Escalating client-sensitive concerns.
- Changing service commitments.

## Cursor Build Requirements

Build a guest intelligence dashboard with concern queue, experience score, request history, communication panel, food trends, event insights, and AI recommendations.


---

<!-- FILE: 17_KPI_Widget_Specifications.md -->

# KPI Widget Specifications

## Purpose

KPI widgets show parent-level status only. They should be clean, centered, and easy to scan.

## General KPI Card Layout

```text
Icon
Title
Primary Value
Secondary Text
Optional Trend
Optional Risk Badge
```

## Design Rules

- KPI values must be centered vertically and horizontally within the card content area.
- Use consistent padding.
- Do not overcrowd KPI cards.
- Use a max of 2 lines of secondary text.
- Use colour only for meaning.

## Recommended KPI Cards

### Current Occupancy

```text
Title: Current Occupancy
Value: 287 / 320
Subtext: 89.7%
Accent: Blue
Icon: users
Open Target: /modules/room-utilization
```

### Available Rooms

```text
Title: Available Rooms
Value: 18 Clean
Subtext: 7 Dirty | 25 Total
Accent: Green
Icon: bed
Open Target: /modules/room-utilization
```

### Rooms at Risk

```text
Title: Rooms at Risk
Value: 12
Subtext: Maintenance + delayed turnover
Accent: Red
Icon: alert
Open Target: /command-center/alerts?category=capacity
```

### HK Readiness

```text
Title: HK Readiness
Value: 92%
Subtext: 14 rooms remaining
Accent: Amber
Icon: broom
Open Target: /modules/housekeeping-workload
```

### Labour Coverage

```text
Title: Labour Coverage
Value: 96%
Subtext: 1 role shortage forecasted tomorrow
Accent: Purple
Icon: users
Open Target: /modules/labour-forecaster
```

### Utility Services

```text
Title: Utility Services
Value: 3.2 days
Subtext: Fuel + sewage risk
Accent: Teal
Icon: water drop or fuel pump
Open Target: /modules/consumables?tab=utility-services
```

### Lodge Supplies

```text
Title: Lodge Supplies
Value: 12.5 days
Subtext: 4 below par
Accent: Teal / Blue
Icon: package
Open Target: /modules/consumables?tab=lodge-supplies
```

### Cost Variance

```text
Title: Cost Variance
Value: +3.8%
Subtext: vs last week
Accent: Orange
Icon: dollar sign
Open Target: /command-center/executive-dashboards?section=cost
```

## Example React-Like Data Object

```json
[
  {
    "id": "utility-services",
    "title": "Utility Services",
    "value": "3.2 days",
    "subtext": "Fuel + sewage risk",
    "accent": "teal",
    "icon": "Droplet",
    "targetRoute": "/modules/consumables?tab=utility-services"
  }
]
```


---

<!-- FILE: 18_Cursor_Master_Build_Prompt.md -->

# Cursor Master Build Prompt

Paste this into Cursor as the main project instruction.

```text
Build a widget-based Smart Lodge Command Intelligence Engine dashboard.

The dashboard is the parent command center for Smart Lodge. It should not show all detailed operational data on the main page. It should show summarized widgets with buttons that open focused detail views.

The dashboard title is:
Smart Lodge Command Intelligence Engine

Subtitle:
Top-Level Intelligence & Decision Orchestration

Supporting text:
Combines operational intelligence, guest intelligence, utility/service intelligence, forecasts, risk alerts, and strategic recommendations.

Use a premium enterprise SaaS style:
- Dark navy command header
- White rounded cards
- Soft shadows
- Light blue/gray background
- Consistent icon alignment
- Centered KPI values
- Clear card spacing
- Clean widget buttons
- Minimal text on parent dashboard
- Detailed information only after opening a widget

Main command summary widgets:
1. Executive Dashboards — button: Open
2. Predictive Analytics — button: View Details
3. Risk & Alert Management — button: Open Alerts
4. Scenario Planning — button: Explore
5. Strategic Recommendations — button: View Details

KPI snapshot widgets:
1. Current Occupancy: 287 / 320, 89.7%
2. Available Rooms: 18 Clean, 7 Dirty
3. Rooms at Risk: 12, Maintenance + delayed turnover
4. HK Readiness: 92%, 14 rooms remaining
5. Labour Coverage: 96%, 1 role shortage forecasted tomorrow
6. Utility Services: 3.2 days, Fuel + sewage risk
7. Lodge Supplies: 12.5 days, 4 below par
8. Cost Variance: +3.8%, vs last week

Operational widgets:
1. Risk & Alerts — button: View All Alerts
2. Command AI Recommendations — button: Review All
3. Child Module Intelligence — button: View Module Health
4. External Integration Health — button: View All Integrations

Child module widgets:
1. Reservation Engine — button: Open Module
2. Room Utilization — button: Open Module
3. Housekeeping Planning & Workload — button: Open Module
4. Lodge Labour Forecaster — button: Open Module
5. Consumables Intelligence — button: Open Module
6. Guest Intelligence — button: Open Module

Create routes or expandable views for:
- /command-center/executive-dashboards
- /command-center/predictive-analytics
- /command-center/alerts
- /command-center/scenario-planning
- /command-center/strategic-recommendations
- /command-center/ai-recommendations
- /command-center/module-health
- /command-center/integrations
- /modules/reservations
- /modules/room-utilization
- /modules/housekeeping-workload
- /modules/labour-forecaster
- /modules/consumables
- /modules/guest-intelligence

Risk & Alert Management layout rule:
Alert rows must not be cramped. Use min-height around 76px, padding around 16px 20px, line-height around 1.35, and vertically center the alert badge and text.

Command Center AI policy:
The parent AI may summarize, recommend, prepare reports, and route users to child modules. It must request human approval before making operational changes, closing high-risk alerts, triggering purchases, scheduling utility service calls, changing staffing, releasing rooms, or sending formal notices.

Child module AI rules:
Reservation Engine manages bookings, arrivals, departures, no-shows, extensions, and approvals.
Room Utilization manages room status, occupancy, on-holds, releases, maintenance holds, and overflow risk.
Housekeeping Planning & Workload manages cleaning tasks, workload points, room readiness, inspections, and re-cleans.
Lodge Labour Forecaster manages staffing forecasts, coverage, labour demand, and role shortages.
Consumables Intelligence manages Utility & Site Service Consumables and Lodge Operating Consumables.
Guest Intelligence manages guest concerns, portal requests, communication, events, food preference signals, and guest experience analytics.

Consumables Intelligence categories:
1. Utility & Site Service Consumables:
- Diesel fuel
- Propane
- Sewage disposal
- Water deliveries
- Garbage removal
- Recycling removal

2. Lodge Operating Consumables:
- Housekeeping supplies
- Guest room supplies
- Laundry supplies
- Kitchen disposables
- Office/admin supplies
- General lodge supplies

Build all widgets from data objects so labels, values, routes, icons, status, and risk levels can be configured.
```


---

<!-- FILE: README_Command_Center_Cursor_Index.md -->

# Smart Lodge Command Intelligence Engine — Cursor Markdown Package

## Purpose

This package breaks the Smart Lodge Command Intelligence Engine into a clean widget-based dashboard where each card or button opens a dedicated detail view.

The design goal is to avoid overcrowding the parent dashboard. The parent command center should show high-level status only, while each widget opens a focused page, modal, drawer, or route with the supporting detail.

## Parent Dashboard Principle

The command center is the parent intelligence layer. It should show:

- Status
- Risk level
- Key numbers
- Open items
- Recommended next action
- Link to details

It should not show all operational data on the main screen.

## Recommended Main Dashboard Layout

### Header

Title:

```text
Smart Lodge Command Intelligence Engine
```

Subtitle:

```text
Top-Level Intelligence & Decision Orchestration
```

Supporting text:

```text
Combines operational intelligence, guest intelligence, utility/service intelligence, forecasts, risk alerts, and strategic recommendations.
```

Header controls:

- Ask Command AI
- Site selector
- Date selector
- Notifications
- User profile
- Settings

---

## Parent Dashboard Widgets

### Command Intelligence Summary Widgets

1. Executive Dashboards
2. Predictive Analytics
3. Risk & Alert Management
4. Scenario Planning
5. Strategic Recommendations

### KPI Snapshot Widgets

1. Current Occupancy
2. Available Rooms
3. Rooms at Risk
4. Housekeeping Readiness
5. Labour Coverage
6. Utility Services
7. Lodge Supplies
8. Cost Variance

### Operational Intelligence Widgets

1. Risk & Alerts
2. Command AI Recommendations
3. Child Module Intelligence
4. External Integration Health

### Child Module Widgets

1. Reservation Engine
2. Room Utilization
3. Housekeeping Planning & Workload
4. Lodge Labour Forecaster
5. Consumables Intelligence
6. Guest Intelligence

---

## Openable Widget Buttons

Each widget should use one of the following actions:

| Button Label | Recommended Use |
|---|---|
| Open | Opens a full dashboard page |
| View Details | Opens a detail drawer or page |
| Open Alerts | Opens the alert management page |
| Explore | Opens scenario planning tools |
| View All | Opens a list view |
| Review All | Opens AI recommendations queue |
| Open Module | Opens child module dashboard |
| View Module Health | Opens child module status page |
| View All Integrations | Opens integration health page |

---

## Suggested Route Structure

```text
/command-center
/command-center/executive-dashboards
/command-center/predictive-analytics
/command-center/alerts
/command-center/scenario-planning
/command-center/strategic-recommendations
/command-center/ai-recommendations
/command-center/module-health
/command-center/integrations
/modules/reservations
/modules/room-utilization
/modules/housekeeping-workload
/modules/labour-forecaster
/modules/consumables
/modules/guest-intelligence
```

---

## File Index

Use these Markdown files in Cursor:

1. `01_Command_Center_AI_Policy_and_Rules.md`
2. `02_Parent_Dashboard_Design_System.md`
3. `03_Executive_Dashboards_Widget.md`
4. `04_Predictive_Analytics_Widget.md`
5. `05_Risk_Alert_Management_Widget.md`
6. `06_Scenario_Planning_Widget.md`
7. `07_Strategic_Recommendations_Widget.md`
8. `08_Command_AI_Recommendations_Widget.md`
9. `09_Child_Module_Intelligence_Widget.md`
10. `10_External_Integration_Health_Widget.md`
11. `11_Reservation_Engine_Widget.md`
12. `12_Room_Utilization_Widget.md`
13. `13_Housekeeping_Planning_Workload_Widget.md`
14. `14_Lodge_Labour_Forecaster_Widget.md`
15. `15_Consumables_Intelligence_Widget.md`
16. `16_Guest_Intelligence_Widget.md`
17. `17_KPI_Widget_Specifications.md`
18. `18_Cursor_Master_Build_Prompt.md`
