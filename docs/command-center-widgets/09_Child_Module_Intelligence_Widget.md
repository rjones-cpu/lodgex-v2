# Child Module Intelligence Widget

## Route

```text
/command-center/module-health
```

## Widget Purpose

The Child Module Intelligence widget shows health and status across all child modules. It helps leaders see which modules are active, warning, delayed, or failing.

## Parent Dashboard Widget

```text
Title: Child Module Intelligence
Status: 7 Modules Active
Warnings: 0 to 2
Health Score: 98%
Button: View Module Health
```

## Child Modules

1. Reservation Engine
2. Room Utilization
3. Housekeeping Planning & Workload
4. Lodge Labour Forecaster
5. Consumables Intelligence
6. Guest Intelligence
7. External Integration Layer, if displayed as a support module

## Openable Detail View Sections

1. Module Health Summary
2. Module Status Cards
3. Open Risks by Module
4. AI Recommendations by Module
5. Sync Status
6. Data Quality Score
7. Last Updated Timestamp
8. Module Dependency Map
9. Audit and Error Logs

## Module Status Values

```text
Active
Warning
At Risk
Disconnected
Syncing
Needs Review
```

## Sample Module Card

```text
Consumables Intelligence
Status: Warning
Utility service coverage: 3.2 days
Lodge supply coverage: 12.5 days
AI recommendations: 4
Open module
```

## AI Policy Rules

The AI may:

- Summarize module health.
- Detect cross-module risk.
- Recommend opening affected modules.
- Prepare module health reports.

The AI must not:

- Override child module rules.
- Hide disconnected integrations.
- Mark module health as resolved without validation.

## Cursor Build Requirements

Build a module health dashboard with module cards, health badges, dependency indicators, warning counts, and open-module buttons.
