# Predictive Analytics Widget

## Route

```text
/command-center/predictive-analytics
```

## Widget Purpose

The Predictive Analytics widget forecasts occupancy, housekeeping workload, labour demand, utility service risk, lodge supply coverage, guest concern trends, and cost variance.

## Parent Dashboard Widget

The parent dashboard card should show only summary-level information and a clear action button.

## Openable Detail View

When the user opens this widget, show a dedicated detail view with the following sections:


1. Occupancy Forecast
2. Housekeeping Workload Forecast
3. Labour Demand Forecast
4. Utility Service Forecast
5. Lodge Supply Forecast
6. Guest Concern Trend
7. Cost and Resource Forecast
8. Forecast Confidence and Data Quality


## Sample Data


```text
Status: Active
7-Day Forecast Updated
Forecast Confidence: 87%
Data Quality: Good
Highest Risk Date: Monday
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


Build charts for 7-day, 14-day, and 30-day forecasts. Include forecast confidence, data quality, and alert markers on high-risk dates. Use clean chart cards with summary text beside each chart.

