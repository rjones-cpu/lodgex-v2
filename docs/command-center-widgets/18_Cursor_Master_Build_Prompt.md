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
