---
name: "dsh-enhancement-analysis"
description: "Analyze any project directly (recon report optional), map pain points onto DeepSeek Harness capabilities; produce a prioritized enhancement report."
status: proposal
version: "0.4.0"
date: "2026-08-19"
---

# DSH Enhancement Analysis

Standalone: works on any project with or without a prior recon report. Output: a DSH enhancement report the user can approve before any code moves. Never write code in this phase.

## Step 0 — What is DSH and why analyze for it (read this first, even with zero prior context)

**DSH (DeepSeek Harness)** is DeepSeek's open-source agent harness (`deepseek-ai/deepseek-harness`). Its thesis: **"Everything is a Plugin"** — built on the Cordis framework, it has NO privileged core. The model adapter, tool registry, session log, even the agent loop itself are all plugins.

Five primitives define it (names verified against the v0.1.0-rc source; re-verify on drift):
- **Event waterfall** — agent-loop stages (`agent/request`, `agent/request-error`, `agent/turn-stopping`, …) and the `llm/stream` waterfall over raw model calls: any plugin can intercept, rewrite, or wrap them
- **Plugin = Service** — plugins attach to stable service keys (`ctx.tools`, `ctx.llm`, `ctx.fs`, `ctx.subprocess`); consumers resolve by key, never import implementations
- **Session = log** — the transcript is the source of truth; replay resumes any run
- **Subagent delegation** — `ctx.subagents.start()` runs one-shot children with structured-output schemas; the in-process `fork` provider shares parent history, `spawn` providers start fresh (native parallel fan-out and A/B)
- **Swappable execution world** — swap `ctx.fs`/`ctx.subprocess` providers and the whole execution environment moves to a VM/container with zero tool changes

**What DSH enables that mainstream harnesses cannot** (this is the goal lens for the whole analysis):
- Claude Code / OpenClaw / Cursor: core loop is NOT replaceable — you can only add tools/prompts around it. DSH's loop is itself a plugin; any stage can be intercepted or swapped
- LangGraph / hand-rolled SDK pipelines: routing, model choice, and checkpointing are compiled into code. In DSH, model routing is a request-hook (hot-swap mid-run), checkpointing is native (session replay), and business rules hang off the waterfall without touching core code
- Native A/B: delegate one task to N child agents in parallel and diff outputs — no harness conventionally offers this as a primitive

**Goal of this skill:** find where these unlocks matter for the target project, honestly bucketed (✅ equivalent / ✅✅ stronger / ⚠️ hard port), with costs stated. Not everything should move to DSH — a credible ⚠️/no-go is a valid result.

## Locating the DSH source

Resolve the local checkout before fact-checking, in order: the `$DSH_ROOT` environment variable; conventional checkout locations (`~/git/deepseek-harness`, `~/src/deepseek-harness`); the GitHub repository `deepseek-ai/deepseek-harness` as last resort. Record the resolved path and commit in the report header; if only GitHub was available, or the checkout is older than the latest tag, say so.

## Workflow

1. **Gather inputs**
   - Optional accelerator: recon report at `dsh-scan/recon-deep-<project>.md` (from `repo-recon`) if one exists
   - No recon report? Read the project directly: README + docs first, then main pipeline files; build the workflow map and pain-point list yourself, with file:line evidence
   - Focus areas to cover when reading directly: entry points, LLM/agent call sites, pipeline stage structure, retry/error handling, model configuration, scheduling
   - DSH source for fact-checks: see "Locating the DSH source" above; primitive detail in `references/dsh-capabilities.md`
2. **Stage the pipeline** — redraw the project workflow as numbered stages (trigger → stages → storage → output). Mark every LLM call point and every pain point onto it
3. **Map to DSH primitives** — for each stage/pain point pick from the five primitives above + `references/dsh-capabilities.md` (waterfall interception, `agent/request` model routing, subagent delegation, plugin services, session-as-log replay, execution-world swap, existing plugins such as `dsh-llm-retry` / `dsh-token-meter` / guard policies)
4. **Bucket every verdict** — ✅ equivalent (drop-in) / ✅✅ stronger (unlocks what the current stack cannot) / ⚠️ hard port (honest cost) — one-line justification each
5. **Honest costs** — language gap, rewrite or wrapper size, plugin/adapter count, release-maturity risk (DSH is pre-1.0: APIs may change without compatibility shims)
6. **Priority matrix** — severity × effort × strategic value → ranked roadmap (table)
7. **Migration path** — default two-step: (a) wrap the project entry behind DSH as a facade (logging/model routing/notifications), zero risk to existing surfaces; (b) port ONE representative stage as a pilot behind a decision gate; only then consider full migration
8. **Generate report** from `templates/report-template.md` → `dsh-scan/dsh-enhance-<project>.md` (unless the user wants it in the project repo). The report must carry the 未深入 list and the non-DSH findings section. Deliver Top findings + the bucket table to the user; wait for approval
9. **Handoff to runtime optimization** — if the project already runs on DSH or the user approves a pilot/migration, recommend `harness-runtime-optimizer` next. The enhancement report defines *where* to intervene; the runtime optimizer verifies *whether the intervention actually improves quality/cost/latency/reliability*.

## Rules

- Every claim carries file:line (from the recon report or your own reading); when unsure re-verify against the DSH source, don't guess
- Never oversell: ⚠️ items stay ⚠️; costs stay explicit (language, hops, rewrite size)
- Findings outside the DSH capability domain (security, storage races, rendering drift, …) go to the non-DSH findings section, not the trash — they are often the most urgent fixes
- Reports in 中文; tables for mappings; ≤300 lines
- Report header records: target repo path + branch + HEAD, recon report path if used, DSH baseline (resolved path + commit + date)
- No code, no PRs, no repo changes until the user approves the report
- DSH facts may drift between releases — re-check the DSH source if the analysis is older than ~2 weeks or predates the latest tag
