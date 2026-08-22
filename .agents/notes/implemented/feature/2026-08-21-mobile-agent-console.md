# Agent Note: Mobile Agent Teams console over an authenticated gateway

Status: implemented

English | [中文](2026-08-21-mobile-agent-console.zh.md)

## Problem

The DSH runtime already has Agent Teams, durable Sessions, provider token usage, a Web UI, and credential references, but those capabilities are assembled separately. A phone operator needs one controlled entry point for several Agents, a progress view, provider quota information, and memory shared by Agents working in the same project. A public Web listener would broaden the existing security posture, while a separate memory or dashboard implementation would duplicate runtime state and lose the durable session model.

## Decision

The private experimental package `@deepseek-ai/dsh-experimental-mobile-agent-console` is a dual Host/Client composition layer. Its bundle patch enables the existing GLM OpenAI-compatible provider route, the experimental Agent Teams and Team tools, and this package's service. The shipped GLM defaults are provider `glm`, model `glm-5`, endpoint `https://open.bigmodel.cn/api/paas/v4`, and credential reference `ZHIPU_API_KEY`; the patch remains overrideable for deployments that use another model or endpoint.

The Host service projects live Agents and the Agent Teams service into one JSON snapshot route. It reads Agent status and Team member/task state from their owning services, derives token totals from durable `assistant/message` and `step/end` session events, opens the selected Agent transcript through the existing Web client, and polls the configured GLM quota monitor into normalized windows. The quota monitor uses the provider's raw API-key authorization, parses the `data.limits` response, and applies a configurable request timeout; it is separate from the GLM chat route's bearer authorization. The Client contributes a sidebar action and overlay panel; its create, send, and stop controls call the client runtime's Session face, resolving Team teammates through their direct-parent catalog before using continuable subagent transport. It does not create a second runtime state store or event vocabulary.

The package stores bounded project memory in `.dsh-memory/memory.jsonl`. `memory_remember` appends validated records through a serialized writer, `memory_recall` performs bounded lexical retrieval, and a pre-step listener injects recent records as a bounded snapshot user message. The injected context is therefore logged before it reaches the model. The memory tools and the existing Team tools are model-visible, while credentials and raw provider quota responses remain Host-only.

The normal DSH WebServer stays loopback-only. An optional separate Node gateway binds the configured host and port, authenticates every HTTP request and WebSocket upgrade with a bearer token or HttpOnly cookie, and proxies to the loopback WebServer. The default gateway binds `0.0.0.0:3082` for a trusted LAN or VPN; the token comes from `DSH_MOBILE_ACCESS_TOKEN` or is generated and printed at startup. The gateway grants the same control surface as the Web UI and is not a multi-user authorization layer.

The package adds no new durable session event kind. Dashboard usage and memory visibility use existing events and the logged snapshot message, so replay does not need a new session-format version. Its invariant contribution is intentionally empty because the service does not own a new durable relationship independent of the Agent, Team, or memory stores.

## Alternatives considered

**Bind the existing WebServer to `0.0.0.0`.** Rejected because it would turn the current Web UI listener into a network-facing control surface and couple mobile access to the existing loopback security decision. The separate gateway gives the new exposure an explicit token, health route, and independent configuration while preserving the main listener.

**Use an external mobile dashboard or memory MCP as the default implementation.** Rejected because an external process would need to reconstruct Agent Teams and Session state, and an MCP memory store would make the model-visible context depend on an additional service. The composition uses the native Team/session owners and a local JSONL store that is easy to inspect and recover.

**Put memory records into the Session event format.** Rejected because project memory is shared across Agents and projects while Session events are owned by one durable conversation. The explicit tool writes remain separate, and the pre-step snapshot records exactly what the model received without introducing a new event schema.

**Add a push-only dashboard transport.** Rejected because the existing Web client already has an authenticated route and Session opening path. A five-second bounded poll is sufficient for an operational overview and keeps the Client/Host wire surface small; the dashboard documents the resulting refresh lag.

## Testing

The Host and Client TypeScript projects compile independently, and the package bundle produces both faces. The repository-level typecheck, Cordis configuration gates, documentation gates, and a built profile startup smoke must remain green for changes to this composition. The dashboard parser rejects malformed untrusted JSON; gateway authentication is exercised separately from the loopback WebServer; quota normalization exposes only its typed projection.

## Consequences

The operator gets one mobile URL for Agent status, Team task progress, session-derived token counts, GLM quota windows, recent project memory, and transcript navigation. Existing Team lifecycle, session persistence, provider accounting, credential loading, and Web UI behavior remain the owners of those concerns.

The composition is single-process and project-local. Teammates share a checkout, memory retrieval is lexical rather than embedding-based, quota display depends on the provider monitor, and dashboard state can lag by one polling interval. The gateway token is effectively full Web UI control, so it must stay on a trusted LAN or VPN and must not be exposed directly to the public Internet.
