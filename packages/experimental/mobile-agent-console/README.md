# @deepseek-ai/dsh-experimental-mobile-agent-console

English | [中文](README.zh.md)

This experimental bundle is a complete mobile control layer for the DSH Web profile. It composes the native Agent Teams roster and tools, a GLM OpenAI-compatible route, a project-shared JSONL memory store, a live dashboard, and a token-authenticated LAN gateway that proxies the existing loopback Web application.

## Run from this checkout

Build the workspace, install this local bundle into the Web profile, and configure a Zhipu GLM key:

```sh
pnpm run build
pnpm dsh plugin --profile web add ./packages/experimental/mobile-agent-console
export ZHIPU_API_KEY=...
export DSH_MOBILE_ACCESS_TOKEN=...
pnpm dsh --profile web --no-open
```

The gateway prints a LAN URL and, when `DSH_MOBILE_ACCESS_TOKEN` is unset, a generated access token. Open `http://<lan-ip>:3082/__dsh_mobile__/login?access_token=<token>` once on the phone; the gateway stores the token in an HttpOnly cookie and then serves the normal Web UI. Set `DSH_MOBILE_ACCESS_TOKEN` before launch when the token must be stable across restarts.

The package is private and experimental, so this local path is the supported installation form until the feature is promoted to a release package. Profile installation also puts the browser half in the profile's client-module roster; a raw `--patch` overlay is useful for Host-only debugging but is not the end-to-end mobile launch path.

## Config

The shipped patch enables the following defaults; a later patch replaces the complete `mobile-agent-console` config, so restate fields that must remain enabled:

```yaml
- id: mobile-agent-console
  name: '@deepseek-ai/dsh-experimental-mobile-agent-console'
  config:
    gatewayEnabled: true
    gatewayHost: 0.0.0.0
    gatewayPort: 3082
    tokenEnv: DSH_MOBILE_ACCESS_TOKEN
    quotaApiKeyEnv: ZHIPU_API_KEY
    quotaCacheMs: 30000
    quotaTimeoutMs: 5000
    memoryDirectory: .dsh-memory
    maxMemoryEntries: 200
    maxMemoryContextBytes: 12000
```

`gatewayEnabled: false` keeps the local dashboard route available through the loopback Web UI without starting a second listener. `gatewayHost: 127.0.0.1` is useful for local smoke tests. `quotaUrl`, `defaultProvider`, and `defaultModel` are also configurable fields on the plugin.

## What is included

- **GLM:** new Agents default to `glm/glm-5`; `glm-4.5-air` is also listed. The route uses `https://open.bigmodel.cn/api/paas/v4` and resolves `ZHIPU_API_KEY` through DSH credentials. Change the `llm-pi-ai` row in a later patch when the account uses another model or endpoint.
- **Multiple Agents:** Agent Teams creates durable named teammates, peer messages, and a shared task DAG in the Lead session. The dashboard reads the live roster and task records, can open any Agent transcript, creates real Sessions for new Agents, and reuses the existing Session/continuation queue and cancellation semantics for sending tasks and stopping Agents.
- **Progress and status:** the dashboard refreshes every five seconds and shows Agent state, Team members, task completion, current model route, and session-derived step/token totals.
- **Quota:** the Host calls the configured GLM monitor endpoint with the provider's raw API-key authorization when `ZHIPU_API_KEY` is available, times out after the configured limit, caches the result for 30 seconds, and exposes only normalized windows and an error state. It never returns the key or raw provider payload.
- **Memory:** `memory_remember` and `memory_recall` write to `.dsh-memory/memory.jsonl` under the session working directory. Recent records are injected as a bounded `snapshot` user message before a model step, so the memory the model sees is durable in the session log.

The Agent controls are not frontend-only state: create, send, and stop actions call the DSH client runtime's Session face and are admitted by the native Host. A Team teammate is resolved through its direct-parent catalog before the continuable subagent transport is used, so a phone can run several parallel Agents from one dashboard while the normal Session log remains authoritative.

## Security and limits

The normal DSH WebServer remains loopback-only. The mobile gateway is the only all-interface listener, and every HTTP request or WebSocket upgrade requires the bearer token or its HttpOnly cookie. The token grants the same control as the Web UI, so use it only on a trusted LAN or VPN and rotate it by changing `DSH_MOBILE_ACCESS_TOKEN`. Do not put the gateway directly on the public Internet.

Usage counts are the provider-reported `assistant/message` token fields in live session logs; a provider that omits accounting cannot be reconstructed by this package. Quota display depends on the GLM monitor response and remains unavailable when no key is configured. Memory retrieval is bounded lexical search over one JSONL file per project directory; it is intentionally local and does not provide embeddings, cross-machine synchronization, or automatic secret redaction.

Agent Teams and the gateway are single-process features. Teammates share the DSH process and checkout, and their write scopes remain advisory. Restarting the process keeps session persistence but does not turn an old Team runtime into a live roster; start a new Team or resume it through the normal DSH session lifecycle.

## Model Experience

### Mobile console context

#### What the model sees

The Team and memory tools are model-visible. `memory_remember` stores a concise fact and `memory_recall` searches project memory; the pre-step memory snapshot is logged before it reaches the model. Team collaboration tools remain owned by `@deepseek-ai/dsh-experimental-tool-agent-team`, so this package does not duplicate their policy or wire vocabulary.

#### Token effect

Each remembered fact returned by `memory_recall` consumes tool-result tokens, and each injected memory snapshot adds user-context tokens before a model step. Team roster and task state stay in the dashboard projection unless a Team tool returns them to the model.

#### KV Cache effect

The memory snapshot is a bounded user message inserted before a model step, so it is part of the logged request context and can affect provider prefix-cache reuse. The package does not assume a provider-specific cache policy.

## Known Limitations and Deferred Work

- The GLM model list and quota response are deployment facts; override the patch when Zhipu changes an available model or account endpoint.
- The dashboard is a polling view, not a second event transport. A refresh can lag a status transition by up to the polling interval.
- The gateway currently proxies the complete Web surface. It does not provide per-user accounts or role-based permissions.
