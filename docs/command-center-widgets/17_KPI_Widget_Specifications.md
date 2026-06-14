# KPI Widget Specifications

## Purpose

KPI widgets show parent-level status only. They should be clean, centered, and easy to scan.

## General KPI Card Layout

```text
Icon
Title
Primary Value
Secondary Text
Optional Trend
Optional Risk Badge
```

## Design Rules

- KPI values must be centered vertically and horizontally within the card content area.
- Use consistent padding.
- Do not overcrowd KPI cards.
- Use a max of 2 lines of secondary text.
- Use colour only for meaning.

## Recommended KPI Cards

### Current Occupancy

```text
Title: Current Occupancy
Value: 287 / 320
Subtext: 89.7%
Accent: Blue
Icon: users
Open Target: /modules/room-utilization
```

### Available Rooms

```text
Title: Available Rooms
Value: 18 Clean
Subtext: 7 Dirty | 25 Total
Accent: Green
Icon: bed
Open Target: /modules/room-utilization
```

### Rooms at Risk

```text
Title: Rooms at Risk
Value: 12
Subtext: Maintenance + delayed turnover
Accent: Red
Icon: alert
Open Target: /command-center/alerts?category=capacity
```

### HK Readiness

```text
Title: HK Readiness
Value: 92%
Subtext: 14 rooms remaining
Accent: Amber
Icon: broom
Open Target: /modules/housekeeping-workload
```

### Labour Coverage

```text
Title: Labour Coverage
Value: 96%
Subtext: 1 role shortage forecasted tomorrow
Accent: Purple
Icon: users
Open Target: /modules/labour-forecaster
```

### Utility Services

```text
Title: Utility Services
Value: 3.2 days
Subtext: Fuel + sewage risk
Accent: Teal
Icon: water drop or fuel pump
Open Target: /modules/consumables?tab=utility-services
```

### Lodge Supplies

```text
Title: Lodge Supplies
Value: 12.5 days
Subtext: 4 below par
Accent: Teal / Blue
Icon: package
Open Target: /modules/consumables?tab=lodge-supplies
```

### Cost Variance

```text
Title: Cost Variance
Value: +3.8%
Subtext: vs last week
Accent: Orange
Icon: dollar sign
Open Target: /command-center/executive-dashboards?section=cost
```

## Example React-Like Data Object

```json
[
  {
    "id": "utility-services",
    "title": "Utility Services",
    "value": "3.2 days",
    "subtext": "Fuel + sewage risk",
    "accent": "teal",
    "icon": "Droplet",
    "targetRoute": "/modules/consumables?tab=utility-services"
  }
]
```
