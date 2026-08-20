# ADR-004: Federated capability resolver

## Status

Accepted (17 Aug 2026). Titles updated 20 Aug 2026 from the Master Agent locked map.

## Context

Crew Hub, Smart Lodge, and Major Projects must run standalone. This repo only implements Smart Lodge surfaces plus a camp-reservations hook. Official IDs were not in the tree when Wave 0 landed. Wave 0 bound Room Inventory Intelligence to SL-01 from an observational guess; that was wrong.

## Decision

- Register only CH-01–CH-11, SL-01–SL-11, MP-01–MP-09
- `isAvailable($id)` is true for any registered ID (product independence)
- Connections are optional lists in config, never required
- Do not hard-code Crew Hub or Major Projects into Smart Lodge agents
- Hierarchy is MP-09; MP-10 is rejected
- Titles come from the Master Agent locked map (Linear: LodgeX AI Agent Map). Do not invent IDs.

Locked Smart Lodge titles used here:

- SL-01 Executive dashboard — Lodge Executive Brief (not this agent)
- SL-02 Reservations and Occupancy — Room Inventory Intelligence (P)
- SL-03 Front Desk — Front Desk Arrival Coach (P); Room Inventory Intelligence is shared

## Consequences

Agents declare official capability IDs and must not `require` another product. Room Inventory Intelligence is bound to **SL-02 + SL-03**. SL-02 and SL-03 may optionally see each other. They do not require Crew Hub or Major Projects.
