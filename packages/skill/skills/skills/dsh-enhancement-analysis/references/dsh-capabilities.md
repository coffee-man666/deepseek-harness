# DSH Capability Map

Fact-checked against the DSH source: v0.1.0-rc.7 (commit 6abc3ca8c9) and re-verified unchanged on v0.1.0-rc.8 (commit 141eb6fef8, 2026-08-19) by reading `packages/llm`, `packages/subagent`, `packages/guard`, `packages/session`; the mapped surfaces (pi-ai profile fields, subagent start request, retry/meter seams) did not change between the two. DSH is pre-1.0 and makes no compatibility promise — re-verify names against the source if this file is older than the checkout you are analyzing.

## Core primitives

- **Plugin = Service** — plugins attach to stable service keys (`ctx.tools`, `ctx.llm`, `ctx.fs`, `ctx.subprocess`); consumers resolve by key, never import implementations. Load order derived from `inject` declarations.
- **Event waterfall** — plugins intercept agent-loop stages (`agent/request`, `agent/request-error`, `agent/turn-stopping`, …) and wrap every raw model call via the `llm/stream` waterfall (caching, logging, routing). No privileged core: the agent loop itself is a plugin.
- **Session = log** — the transcript is the source of truth; replay resumes any session (replaces hand-rolled checkpointing). Anything model-visible is reconstructable from the log.
- **Subagent delegation** — `ctx.subagents.start(name, request)` runs one-shot children; requests may select the model, require a structured-output schema (`outputSchema`), cap delegation depth, filter tools, set a persona. Providers: `subagent-fork-in-process` (child sees parent history — parallel A/B), `subagent-spawn-in-process` (fresh context), plus out-of-process providers (Codex, Claude Code, ACP, SDK). Continuable children: `startContinuable` + `followup`.
- **Swappable execution world** — replace `ctx.fs` / `ctx.subprocess` providers → file and process operations run in a VM / container; tools unchanged.

## Shipped capability plugins worth mapping to directly

| Plugin | Seams | What it gives a migrated pipeline |
|---|---|---|
| `@deepseek-ai/dsh-llm-retry` | listens on `agent/request-error` | provider-scoped retry policy (default retries degenerate empty completions; policy captured per adapter route) |
| `@deepseek-ai/dsh-token-meter` | `ctx.tokenMeter` | replay-aware token measurement per model request — cost accounting without hand-rolled counters |
| `dsh-guard` (`timeout-policy`, `repeat-tool-reminder`) | loop hygiene | tool timeouts and loop-hygiene enforcement |
| `dsh-compaction`, `dsh-web`, `dsh-shell`, `dsh-subprocess` | service keys | context compaction, search/fetch, shell, process-tree capabilities |
| `dsh-session` | durable log | persistence, projection, replay |

## Pain-point archetype → primitive

| Archetype (from recon) | DSH primitive | Bucket tendency |
|---|---|---|
| LLM provider/model hardcoded per call | `agent/request` interceptor routing, or per-request model selection at the subagent/llm seam (strong model for reasoning, cheap for mechanical steps) | ✅✅ stronger (hot-swap) |
| Zero retry / silent LLM failure | `dsh-llm-retry` on `agent/request-error` + adapter-owned retry policy | ✅ |
| Business filter/rule welded into core | waterfall interception: rewrite/short-circuit event payloads | ✅ |
| Serial stages, no streaming, spinner UX | orchestrator plugin: parallel fan-out (subagents) + event stream | ✅ |
| No unified cache; repeated upstream fetches | service plugin on a stable key, injected where needed | ✅ |
| Conflicting sources need judgment (reconcile) | delegate two fork-style children as arbiter + merge rule | ✅✅ |
| Hand-rolled checkpoint/resume | session-as-log replay | ✅✅ stronger |
| Cost control absent | `dsh-token-meter` + request-hook budget counters + per-stage model routing | ✅ |
| Observability bolted on afterwards | event waterfall IS the trace; session log is the canonical audit | ✅✅ |
| Python tool inventory (yfinance, fetchers…) | MCP-ize or subprocess bridge — one extra hop | ⚠️ cost |
| Shared TypedDict/graph state (LangGraph style) | no native equivalent; model as session context yourself | ⚠️ hard port |
| Execution isolation / dirty-host risk | swap ctx.fs/ctx.subprocess providers | ✅ |
| Notifications, memory, scheduling | capability plugins exist in the tree (workflow, todo, compaction); check the package catalog for the exact list | ✅ |

## Plugin / bundle anatomy (from `packages/bundle`)

A deployable extension is a bundle package:

```
<bundle>/
├── package.json      # workspace package, bundles ride the dsh --profile patch-layer
├── cordis.patch.yml  # rows added on top of a base profile composition
├── src/index.ts      # apply(ctx): register services / systemPrompt / tools
└── README.md
```

- Compositions are `cordis.yml` files; a deployment picks a profile and layer bundles on it. Plugin `config` accepts `!!js` literals; other metadata stays literal.
- The LLM service (`ctx.llm`) exposes `registerAdapter(providers, adapter)` and `stream()`; per-route retry policy is captured at registration time. Twin adapters ship: `dsh-llm-deepseek` and `dsh-llm-pi-ai`.

## LangGraph-style pipeline migration notes (generalized)

- Conditional routing + debate rotation → hand-written orchestrator loop ✅
- ToolNode tool loop → native DSH agent loop, tools on `ctx.tools` ✅
- quick/deep dual models → request-hook routing, hot-swappable ✅✅
- Checkpointer (SqliteSaver & friends) → session-as-log replay ✅✅
- Shared N-field graph state → ⚠️ model as session context yourself
