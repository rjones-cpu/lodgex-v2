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

