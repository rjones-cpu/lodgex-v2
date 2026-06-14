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
