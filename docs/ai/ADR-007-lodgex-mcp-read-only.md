# ADR-007: lodgex-mcp read-only Worker source

## Status

Accepted (20 Aug 2026)

## Context

The live Cloudflare Worker `lodgex-mcp` only exposed `ping` and `whoami`. There is no separate GitHub repo. Wave 1 needs a machine-readable surface for Room Inventory Intelligence without giving the Worker assign / hold / release / check-in.

## Decision

- Keep Worker source in this repo at `workers/lodgex-mcp/`
- Tools are read-only except `create_proposal`, which persists an `AiProposal` only
- Laravel `/api/ai/room-inventory/*` is the data plane; Worker uses `LODGEX_API_BASE` + `LODGEX_MCP_TOKEN`
- Do not hard-code a staging host
- Do not deploy from the application PR unless wrangler is already set up and safe
- Explicitly refuse assign / hold / release / check-in

## Consequences

MCP clients can inspect inventory and queue shadow proposals. Occupancy writes still require a person on the LodgeX approve path.
