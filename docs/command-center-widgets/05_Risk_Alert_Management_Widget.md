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
