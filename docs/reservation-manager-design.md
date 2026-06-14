# Reservation Manager — Design & Module Spec

Child module of **Smart Lodge Command Center**. Source widgets: `docs/command-center-widgets/11_Reservation_Engine_Widget.md`.

## Route

```text
/modules/reservations
```

Named route: `reservations`

## Purpose

The Reservation Manager handles bookings, holds, arrivals, departures, room extensions, no-shows, company allotments, and schedule-linked demand. The parent Command Center shows summary only; this page holds operational detail.

## Page Header

- Title: **Reservation Manager**
- Subtitle: Manage bookings, arrivals, departures, no-shows, extensions, and company allotments.
- Breadcrumb: Child Module • Smart Lodge Command Center
- Controls: Ask Reservation AI, site selector, date, notifications, user profile

## Layout

```text
Sidebar (app nav) | Main column
  - Navy header
  - Primary metrics row (5 cards)
  - Secondary metrics row (6 cards)
  - Two-column body (left wide, right narrow)
```

## Widgets

### Primary metrics

| Widget | Example |
|--------|---------|
| Total Active Reservations | 312 |
| Arrivals Today | 34 |
| Departures Today | 18 |
| Pending Approvals | 9 |
| No-Show Risk | 8 |

### Secondary metrics

| Widget | Example |
|--------|---------|
| Confirmed Check-Ins | 26 |
| Open Extension Requests | 7 |
| Walk-In Requests | 12 |
| Company Allotments in Use | 68% |
| Rooms Assigned | 298 |
| Forecast Accuracy | 91% |

### Left column

1. Today's Arrivals & Departures (table)
2. Approval Workflow (table)
3. No-Show & Exception Monitoring
4. Forecast & Reporting (7-day chart)

### Right column

1. AI Reservation Assistant
2. Room Allocation & Availability
3. Company Allotments
4. Forecast Summary

## AI policy

**May:** identify arrivals/departures, flag duplicates/no-shows, recommend follow-ups, prepare reports.

**Requires approval:** walk-in approval, deny extensions, override approval status, release rooms tied to active reservations, formal contractor notices.

## Related routes

- Command Center: `/command-center`
- Reservation Operations (legacy queue): `/dashboard`
