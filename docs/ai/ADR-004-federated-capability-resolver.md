# ADR-004: Federated capability resolver

## Status

Accepted (17 Aug 2026)

## Context

Crew Hub, Smart Lodge, and Major Projects must run standalone. This repo only implements Smart Lodge surfaces plus a camp-reservations hook. Official IDs were not in the tree.

## Decision

- Register only CH-01–CH-11, SL-01–SL-11, MP-01–MP-09
- `isAvailable($id)` is true for any registered ID (product independence)
- Connections are optional lists in config, never required
- Activity Director / Chef stay under Smart Lodge IDs (SL-09 / SL-10 observational)
- Hierarchy is MP-09; MP-10 is rejected
- Titles in config are observational, documented as such

## Consequences

Agents declare a capability ID and must not `require` another product. Room Inventory Intelligence uses SL-01 and may *optionally* see SL-02 / SL-04.
