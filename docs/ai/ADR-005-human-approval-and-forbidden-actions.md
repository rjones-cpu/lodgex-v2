# ADR-005: Human approval and forbidden actions

## Status

Accepted (17 Aug 2026)

## Context

Policy docs already list high-impact ops that need a person. Code did not enforce that for LLM output, overtime, or scorecard math.

## Decision

- `ForbiddenActions` + `AiOutputValidator` reject executable/high-impact actions from model output
- Overtime: `OvertimeApprovalService` + Gate `approve-overtime`; Lodge Manager only; fail closed
- Scorecard: `ScorecardGradeCalculator` uses lowest applicable component; no AI write API
- Provider and proposal audits never store API keys
- AI explanations are optional; Laravel services remain the source of truth

## Consequences

Future agents can reuse the validator and overtime gate without copying prompt-only rules. Prompt text is not treated as authorization.
