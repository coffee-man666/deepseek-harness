---
name: "dsh-enhancement-analysis"
description: "Analyze any project directly (recon report optional), map pain points onto DeepSeek Harness capabilities; produce a prioritized enhancement report."
status: proposal
version: "0.2.0"
date: "2026-08-18"
---

# DSH Enhancement Analysis

Standalone: works on any project with or without a prior recon report. Output: a DSH enhancement report the user can approve before any code moves. Never write code in this phase.

## Step 0 — What is DSH and why analyze for it (read this first, even with zero prior context)

**DSH (DeepSeek Harness)** is DeepSeek's open-source agent harness (`deepseek-ai/deepseek-harness`, local clone at `~/git/deepseek-harness/`). Its thesis: **"Everything is a Plugin"** — built on the Cordis framework, it has NO privileged core. The model adapter, tool registry, session log, even the agent loop itself are all plugins.

Five primitives define it:
- **Event waterfall** — every agent-loop stage (`agent/request`, `agent/turn-stopping`, …) is an event any plugin can intercept, rewrite, or short-circuit
- **Plugin = Service** — plugins attach to stable service keys (`ctx.tools`, `ctx.llm`, `ctx.fs`, `ctx.subprocess`); consumers resolve by key, never import implementations
- **Session = log** — the transcript is the source of truth; replay resumes any run
- **`ctx.sessions.fork()`** — branch one history to N models in parallel and diff outputs
- **Swappable execution world** — swap `ctx.fs`/`ctx.subprocess` providers and the whole execution environment moves to a VM/container with zero tool changes

**What DSH enables that mainstream harnesses cannot** (this is the goal lens for the whole analysis):
- Claude Code / OpenClaw / Cursor: core loop is NOT replaceable — you can only add tools/prompts around it. DSH's loop is itself a plugin; any stage can be intercepted or swapped
- LangGraph / hand-rolled SDK pipelines: routing, model choice, and checkpointing are compiled into code. In DSH, model routing is a request-hook (hot-swap mid-run), checkpointing is native (session replay), and business rules hang off the waterfall without touching core code
- Native A/B: fork one task to two models and diff — no harness conventionally offers this as a primitive

**Goal of this skill:** find where these unlocks matter for the target project, honestly bucketed (✅ equal / ✅✅ stronger / ⚠️ hard port), with costs stated. Not everything should move to DSH — a credible ⚠️/no-go is a valid result.

## Workflow

1. **Gather inputs**
   - Optional accelerator: recon report (`dsh-scan/deep-<project>.md` or repo-recon output) if one exists
   - No recon report? Read the project directly: README + docs first, then main pipeline files; build the workflow map and pain-point list yourself, with file:line evidence
   - Focus areas to cover when reading directly: entry points, LLM/agent call sites, pipeline stage structure, retry/error handling, model configuration, scheduling
   - DSH source at `~/git/deepseek-harness/` for fact-checks; plugin pattern proven in `~/git/dsh-plugin-cua/`; primitive detail in `references/dsh-capabilities.md`
2. **Stage the pipeline** — redraw the project workflow as numbered stages (trigger → stages → storage → output). Mark every LLM call point and every pain point onto it
3. **Map to DSH primitives** — for each stage/pain point pick from the five primitives above + `references/dsh-capabilities.md` (waterfall interception, `agent/request` model routing, `ctx.sessions.fork`, plugin services, session-as-log replay, execution-world swap, community plugins)
4. **Bucket every verdict** — ✅ 可替 (drop-in equivalent) / ✅✅ DSH 更强 (unlocks what the current stack cannot) / ⚠️ 硬移植点 (honest hard port) — one-line justification each
5. **Honest costs** — language gap (Python→TS), tool MCP-ization count, rc-stage maturity risk, rewrite line estimate
6. **Priority matrix** — severity × effort × strategic value → ranked roadmap (table)
7. **Migration path** — default two-step: (a) wrap project entry as MCP tool, zero risk, DSH as facade (logging/model routing/notifications); (b) port ONE representative stage as a pilot plugin behind a decision gate; only then consider full migration
8. **Generate report** from `templates/report-template.md` → `dsh-scan/dsh-enhance-<project>.md` (unless user wants it in the project repo). Deliver Top findings + the bucket table to the user; wait for approval
9. **Handoff to runtime optimization** — if the project already runs on DSH or the user approves a pilot/migration, recommend `harness-runtime-optimizer` next. The enhancement report defines *where to intervene*; the runtime optimizer verifies *whether the intervention actually improves quality/cost/latency/reliability*.

## Rules

- Every claim carries file:line (from recon report or your own reading); when unsure re-verify against DSH source, don't guess
- Never oversell: ⚠️ items stay ⚠️; costs stay explicit (language, hops, rewrite size)
- Reports in 中文; tables for mappings; ≤300 lines
- No code, no PRs, no repo changes until the user approves the report
- DSH facts may drift (rc stage) — re-check `~/git/deepseek-harness/` docs if analysis is older than ~2 weeks
