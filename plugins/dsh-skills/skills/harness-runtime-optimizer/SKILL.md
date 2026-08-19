---
name: "harness-runtime-optimizer"
description: "Observe, experiment on, and optimize an agent harness runtime loop as a policy layer: routing, context, retry, stopping, tools, branching, budgeting, and execution-world policies. Designed for DSH but usable as a harness-neutral methodology."
status: proposal
version: "0.3.2"
date: "2026-08-19"
---

# Harness Runtime Optimizer

Turn an agent harness from a static orchestration scaffold into an **experimentable runtime policy layer**. This skill does NOT ask only "can this project migrate to DSH?" It asks:

> Given the same task distribution, where is the runtime wasting intelligence, latency, tokens, tool calls, or reliability — and which policy change measurably improves it?

The output is an evidence-backed optimization plan and, when execution is authorized, a controlled experiment loop. Never declare an optimization successful without before/after metrics.

## Mental model

Treat the harness runtime as a policy `π` operating over observable state `s_t`: `action_t = π(s_t)`, where actions include model choice, context construction, tool exposure, retry/fallback, branch/fork, stopping, budget allocation, execution environment, and merge/arbiter behavior.

Optimize a multi-objective utility such as `U = task_quality - λ1*cost - λ2*latency - λ3*failure_risk - λ4*operational_complexity`. Weights come from the user/project objective. If no weights are given, report the Pareto frontier instead of inventing a single winner.

## Inputs

Use any available combination; do not block on missing inputs — start with static analysis, mark unobservable quantities, and propose the smallest instrumentation to measure them: project source; recon report (`repo-recon`); DSH enhancement report (`dsh-enhancement-analysis`); runtime traces (session logs, token/cost/latency, tool-call traces, evaluator scores); a representative task corpus; the DSH source (see `dsh-enhancement-analysis` → "Locating the DSH source").

## Loop

Phase detail, checklists, and diagnosis signatures live in [`references/runtime-optimizer-phases.md`](references/runtime-optimizer-phases.md); the intervention index lives in [`references/runtime-policy-catalog.md`](references/runtime-policy-catalog.md).

1. **Phase 0 — Optimization contract**: task distribution, primary objectives, guardrails, decision rule (default provisional rule: no material quality regression; adopt only on a clear, segment-stable operational win).
2. **Phase 1 — Observability map**: `request → context build → model request → response → tool selection → execution → observation → next turn → stopping → output`; inventory per stage what is observable and which policy controls it. Deliverable: coverage table (`metric → source → coverage → missing instrumentation → priority`).
3. **Phase 2 — Diagnose waste**: policy failures, not code smells; every diagnosis carries trace or `file:line` evidence plus impact surface (quality/cost/latency/reliability/complexity).
4. **Phase 3 — Interventions**: across policy families (routing, context, retry/fallback, stopping, tools, branching, merge/arbiter, budget, execution world, session/memory); each states `hypothesis → trigger → policy change → expected benefit → likely failure mode → metrics → rollback condition`.
5. **Phase 4 — Experiment**: paired comparison on a frozen task set; one policy dimension changed unless explicitly bundled; record the minimum scorecard below; segment by task type — averages hide regressions.
6. **Phase 5 — Verdict**: ADOPT / REJECT / SEGMENT. Prefer SEGMENT over averaging away heterogeneous results.
7. **Phase 6 — Iterate**: build `task/runtime features → policy choice → observed reward` deterministically first; only add learned selection with bounded exploration, hard guardrails, and rollback.

### Minimum scorecard

| Metric | Baseline P0 | Candidate P1 | Delta | Guardrail / target | Verdict |
|---|---:|---:|---:|---|---|
| Task success / quality | | | | | |
| Total latency | | | | | |
| Input + output tokens | | | | | |
| Estimated/actual cost | | | | | |
| Tool calls | | | | | |
| Model calls | | | | | |
| Retry/fallback rate | | | | | |
| Turns to completion | | | | | |

## DSH-specific leverage

Runtime policy can live outside business logic: `agent/request` interception → model routing, budgets, fallbacks; `agent/request-error` + `dsh-llm-retry` → retry execution; `llm/stream` waterfall → caching/logging on raw model calls; event waterfall → instrumentation and stopping hooks; session-as-log → replayable experiments; `ctx.subagents.start()` (fork/spawn providers) → paired branch/model experiments; service-key injection → swappable cache, tools, filesystems, subprocess worlds.

Do not treat these as automatic wins. Measure whether the primitive actually improves the target workload. Re-check the DSH source if the exact API surface may have drifted.

## Outputs

Default report path: `dsh-scan/runtime-opt-<project>.md` using `templates/runtime-optimization-report.md`. A complete report contains: optimization contract; runtime/observability map; baseline scorecard; diagnosed waste with evidence; ranked policy hypotheses; experiment design; before/after results when runs are authorized; adopt/reject/segment decisions; resulting policy table; next experiment queue.

## Rules

- Evidence first: runtime claims need trace evidence; static architecture claims need `file:line` evidence.
- One variable at a time by default; explicitly label bundled experiments.
- Never optimize cost/latency by silently sacrificing quality.
- Never claim causality from an uncontrolled before/after anecdote.
- Report heterogeneity by task segment when it changes the decision.
- No autonomous production rollout. Changes to production policy require explicit user approval.
- No self-modifying policy without hard caps, logging, rollback, and user-approved objectives.
- If no reliable evaluator exists, improving the evaluator/instrumentation is Priority 0.
