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
