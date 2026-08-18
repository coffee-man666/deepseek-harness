# DSH Capability Map

Fact-checked against `~/git/deepseek-harness` v0.1.0-rc + dsh-plugin-cua build (2026-08). Re-verify if stale.

## Core primitives

- **Plugin = Service** — plugins attach to stable service keys (`ctx.tools`, `ctx.llm`, `ctx.fs`, `ctx.subprocess`); consumers resolve by key, never import implementations. Load order derived from `inject` declarations.
- **Event waterfall** — any plugin can intercept/rewrite/short-circuit agent-loop stages (`agent/request`, `agent/turn-stopping`, …). No privileged core: the agent loop itself is a plugin.
- **Session = log** — transcript is source of truth; replay resumes any session (replaces hand-rolled checkpointing).
- **`ctx.sessions.fork()`** — branch one history to N models in parallel, diff outputs: native A/B testing.
- **Swappable execution world** — replace `ctx.fs` / `ctx.subprocess` providers → Bash/PTY/file ops run in Lume VM / Docker; tools unchanged.
- **Everything is a plugin** — model adapter, tool registry, session log, agent loop, UI.

## Pain-point archetype → primitive

| Archetype (from recon) | DSH primitive | Bucket tendency |
|---|---|---|
| LLM provider/model hardcoded per call | waterfall `agent/request` routing / cascade (strong for reasoning, cheap for mechanical steps) | ✅✅ stronger (hot-swap) |
| Zero retry / silent LLM failure | interceptor at the request seam: retry + rate-limit + circuit-break | ✅ |
| Business filter/rule welded into core (e.g. price-realized) | waterfall interception: rewrite/short-circuit event payloads | ✅ |
| Serial stages, no streaming, spinner UX | plugin orchestrator: parallel fan-out + event stream | ✅ |
| No unified cache; repeated upstream fetches | service plugin on a stable key (Redis-backed), injected where needed | ✅ |
| Conflicting sources need judgment (reconcile) | fork() two models as arbiter + merge rule | ✅✅ |
| Hand-rolled checkpoint/resume | session-as-log replay | ✅✅ stronger |
| Multi-agent debate / rotation loops | ~100-line TS orchestrator plugin, count-termination | ✅ |
| Python tool inventory (yfinance, fetchers…) | MCP-ize or subprocess bridge — one extra hop | ⚠️ cost |
| Shared TypedDict/graph state (LangGraph style) | no native equivalent; model as session context | ⚠️ hard port |
| Execution isolation / dirty-host risk | swap ctx.fs/ctx.subprocess to VM | ✅ |
| Notifications (Telegram etc.) | community plugin exists (voice/memory/workflow/automation categories, ~204 plugins) | ✅ |
| Observability bolted on afterwards | event waterfall IS the trace | ✅✅ |
| Cost control absent | request-hook budget/counter + per-stage model routing | ✅ |

## Plugin anatomy (proven in dsh-plugin-cua)

```
plugin/
├── package.json      # declares dsh.bundle.patch
├── cordis.patch.yml  # bundle-layer entries (mcp servers etc.)
├── lib/index.js      # apply(ctx): register services / systemPrompt / tools
└── README.md
```

- Install: `dsh plugin add` — note: `link:` installs resolve deps from the REAL path (symlink target), so peer deps must be resolvable there
- Web UI: `dsh web` → 127.0.0.1:3080
- Cordis framework underpins it (dependency-injected services, declarative `inject`)

## LangGraph migration notes (tradingagents-private case)

- Conditional routing + debate rotation → hand-written orchestrator loop ✅
- ToolNode tool loop → native DSH agent loop, tools on `ctx.tools` ✅
- quick/deep dual models → request-hook routing, hot-swappable ✅✅
- SqliteSaver checkpoints → session-as-log replay ✅✅
- Shared 17-field AgentState → ⚠️ model as session context yourself
