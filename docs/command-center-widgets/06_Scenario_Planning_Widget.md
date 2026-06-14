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

