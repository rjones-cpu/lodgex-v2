# Strategic Recommendations Widget

## Route

```text
/command-center/strategic-recommendations
```

## Widget Purpose

The Strategic Recommendations widget shows AI-generated opportunities to improve room utilization, reduce cost, improve service, correct data issues, and protect lodge continuity.

## Parent Dashboard Widget

The parent dashboard card should show only summary-level information and a clear action button.

## Openable Detail View

When the user opens this widget, show a dedicated detail view with the following sections:


1. Recommendation Queue
2. Business Value Summary
3. Risk Reduction Summary
4. Cost Savings Estimate
5. Affected Modules
6. Approval Requirements
7. Recommendation Status
8. Action History


## Sample Data


```text
Status: 6 Recommendations
Require Approval: 2
Top Recommendation: Release unused on-hold rooms
Estimated Value: Avoid hotel overflow
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


Build recommendation cards with title, category, business impact, expected benefit, confidence, approval required, and buttons for Review, Prepare Action, Approve, Dismiss, and Open Module.

