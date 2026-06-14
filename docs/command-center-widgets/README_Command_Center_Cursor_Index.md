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
