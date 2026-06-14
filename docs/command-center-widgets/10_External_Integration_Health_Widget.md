# External Integration Health Widget

## Route

```text
/command-center/integrations
```

## Widget Purpose

The External Integration Health widget monitors whether key external systems are connected, syncing, and providing reliable data.

## Parent Dashboard Widget

```text
Title: External Integration Health
Status: Connected
Systems:
- Property Management System
- Finance / ERP
- Supplier Network
Button: View All Integrations
```

## Integration Categories

### Workforce and Schedule Systems

- Individual Company Schedule Systems
- Major Projects Master Schedule
- LodgeX Worker App
- External Data Sources

### Enterprise Systems

- Finance / ERP
- Reporting systems
- Supplier network
- API / REST services
- Secure webhooks
- SFTP / file exchange
- SQL / database connectors

## Openable Detail View Sections

1. Integration Summary
2. Connected Systems
3. Sync Status
4. Last Sync Time
5. Records Received
6. Records Sent
7. Data Quality Score
8. Failed Syncs
9. Retry Queue
10. Integration Error Logs

## Status Values

```text
Connected
Syncing
Warning
Failed
Disconnected
Delayed
```

## AI Policy Rules

The AI may:

- Detect sync issues.
- Flag stale data.
- Recommend a data quality review.
- Prepare integration issue summaries.

The AI must not:

- Change integration credentials.
- Disable integrations.
- Push data to external systems without configured authorization.
- Hide integration failures.

## Cursor Build Requirements

Build an integration health page with system cards, data quality scores, last sync times, error logs, and retry status.
