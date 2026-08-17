# ADR-001: Provider-neutral AI interface

## Status

Accepted (17 Aug 2026)

## Context

lodgex-v2 had no LLM client. The official xAI API (as of 16 Aug 2026) prefers `POST /v1/responses` at `https://api.x.ai/v1`. Chat Completions is legacy. Tests must not hit the network.

## Decision

- `AiProvider` interface + `AiCompletionRequest` / `AiCompletionResult`
- First adapter: `XaiProvider` (Responses API, Bearer `XAI_API_KEY`)
- `MockProvider` for tests and missing keys
- `AiProviderRegistry` selects the driver; testing always uses mock
- Allowed model slugs only: `grok-4.6` (default), `grok-4.5`, `grok-4.3`, `grok-build-0.1`, `grok-4.20-*`
- `store: false` so lodge prompts are not kept on xAI servers by default

## Consequences

Swapping providers does not change agents. No vendor SDK in composer. No secrets in git.
