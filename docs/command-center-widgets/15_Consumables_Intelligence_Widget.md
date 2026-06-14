# Consumables Intelligence Widget

## Route

```text
/modules/consumables
```

## Widget Purpose

The Consumables Intelligence module tracks, forecasts, and controls consumable inventory and utility/site service usage across the lodge.

It is split into two categories:

1. Utility & Site Service Consumables
2. Lodge Operating Consumables

## Parent Dashboard Card

```text
Title: Consumables Intelligence
Status: Active or Warning
Summary: Monitor supplies, inventory, and reorder planning
Button: Open Module
```

## KPI Widgets

### Utility Services

```text
Title: Utility Services
Value: 3.2 days
Subtext: Fuel + sewage risk
```

### Lodge Supplies

```text
Title: Lodge Supplies
Value: 12.5 days
Subtext: 4 below par
```

## Openable Module Sections

1. Utility & Site Service Dashboard
2. Lodge Operating Supplies Dashboard
3. Daily Utility Monitoring
4. Inventory Status
5. Below-Par Items
6. Reorder Recommendations
7. Purchase Order Recommendations
8. Supplier Performance
9. Usage Variance
10. Cost Forecast
11. Waste and Shrinkage
12. Service Schedule Validation

## Utility & Site Service Consumables

These are monitored daily:

- Diesel fuel
- Propane
- Sewage disposal
- Water deliveries
- Garbage removal
- Recycling removal

## Lodge Operating Consumables

These are inventory-controlled:

- Housekeeping supplies
- Guest room supplies
- Laundry supplies
- Kitchen disposables
- Office/admin supplies
- General lodge supplies

## AI Rules

The Consumables AI may:

- Forecast usage.
- Calculate coverage days.
- Identify below-par items.
- Recommend reorder quantities.
- Flag service risks.
- Flag supplier delays.
- Flag waste or usage variance.
- Prepare purchase recommendations.

Human approval is required for:

- Purchase orders.
- Changing par levels.
- Changing suppliers.
- Scheduling service calls.
- Closing utility service risk alerts.
- Changing client/project thresholds.

## Cursor Build Requirements

Build a consumables module with two tabs: Utility & Site Services and Lodge Operating Consumables. Include daily monitoring, coverage days, reorder queue, supplier performance, usage variance, PO recommendation flow, and approval workflow.
