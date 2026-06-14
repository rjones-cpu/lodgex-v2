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
