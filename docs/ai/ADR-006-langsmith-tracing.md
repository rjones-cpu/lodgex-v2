# ADR-006: Optional LangSmith tracing

## Status

Accepted (20 Aug 2026)

## Context

LangSmith is LodgeX's agent-management / tracing system. There is no first-party PHP SDK that is a good fit for this Laravel runner, and there is no existing LangSmith project named `lodgex`. Tracing must never be required at runtime (tests and lodges without a key).

## Decision

- Wrap `AiRunner` with a small HTTP client (`LangSmithTracer`), provider-neutral
- Default project for this agent: `lodgex-room-inventory-intelligence`
- Enable only when `LANGSMITH_API_KEY` or `LANGCHAIN_API_KEY` is set
- Swallow tracing errors so xAI / mock completions still succeed
- Do not send API keys in traced payloads

## Consequences

Operators can turn tracing on with env only. Tests keep `LANGSMITH_API_KEY` empty. Future agents can set `config('ai.agents.*.langsmith_project')`.
