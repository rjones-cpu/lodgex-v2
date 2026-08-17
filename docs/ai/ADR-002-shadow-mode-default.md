# ADR-002: Shadow mode by default

## Status

Accepted (17 Aug 2026)

## Context

Command Center and child-module rules already say decision-support only. The dashboard AI Assign button nonetheless wrote rooms.

## Decision

- `AI_MODE=shadow` default
- Shadow and propose both generate visible proposals; neither lets AI execute high-impact ops
- Human approve is the only write path, and it uses existing services
- `AI_MODE=off` disables generation
- Per-agent overrides live under `config/ai.php` `agents.*`

## Consequences

Operators can see recommendations immediately without auto-assignment. Turning on xAI is an env-key change, not a mode that grants write access.
