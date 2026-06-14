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
