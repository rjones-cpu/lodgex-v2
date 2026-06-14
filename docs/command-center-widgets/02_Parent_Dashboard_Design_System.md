# Parent Dashboard Design System

## Design Goal

The Smart Lodge Command Intelligence Engine should feel like an executive command center, not a dense operational spreadsheet.

The parent page should show summarized widgets. Each widget opens detailed information through a dedicated page, drawer, modal, or tab view.

## Visual Style

### Colours

```text
Primary Navy: #061A3A
Command Blue: #0B5ED7
Light Background: #F5F8FC
Card White: #FFFFFF
Border: #D8E2F0
Text Dark: #102033
Text Muted: #667085
Success Green: #0F7B4F
Warning Amber: #F59E0B
Risk Red: #DC2626
Guest Purple: #4B2495
Consumables Teal: #008C8C
```

### Cards

Use:

- 16px to 20px rounded corners
- Light border
- Soft shadow
- Consistent padding
- Centered KPI values
- Left-aligned labels
- Clear call-to-action button
- Icon in a soft badge

### Typography

```text
Page title: 32px to 40px, bold
Section title: 20px to 24px, semibold
Card title: 15px to 18px, semibold
KPI value: 28px to 36px, bold
Body text: 13px to 15px
Micro text: 11px to 12px
```

## Parent Dashboard Grid

Recommended desktop layout:

```text
Header
Command Summary Row
KPI Snapshot Row
Risk / Recommendations / Module Health / Integration Health
Child Module Cards
```

## Widget Open Behaviour

Each widget should have:

```text
id
title
status
primaryValue
secondaryText
riskLevel
icon
accentColor
ctaLabel
targetRoute
```

## Example Widget Object

```json
{
  "id": "risk-alert-management",
  "title": "Risk & Alert Management",
  "status": "4 Open Alerts",
  "primaryValue": "4 Open Alerts",
  "secondaryText": "1 high priority",
  "riskLevel": "high",
  "icon": "AlertTriangle",
  "accentColor": "red",
  "ctaLabel": "Open Alerts",
  "targetRoute": "/command-center/alerts"
}
```

## Widget Button Labels

Use action labels that match the purpose:

- Executive Dashboards: `Open`
- Predictive Analytics: `View Details`
- Risk & Alert Management: `Open Alerts`
- Scenario Planning: `Explore`
- Strategic Recommendations: `View Details`
- Command AI Recommendations: `Review All`
- Child Module Intelligence: `View Module Health`
- External Integration Health: `View All Integrations`
- Child modules: `Open Module`

## Responsive Behaviour

On desktop:

- Use 5 summary widgets across the top.
- Use 8 KPI cards in one row or two rows.
- Use 4 operational cards in a grid.
- Use child module cards in a 6-column or 3-column grid.

On tablet:

- Use 2 to 3 columns.

On mobile:

- Use one column with sticky search and filter controls.
