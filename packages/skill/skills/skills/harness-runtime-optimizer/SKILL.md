---
name: "harness-runtime-optimizer"
description: "Observe, experiment on, and optimize an agent harness runtime loop as a policy layer: routing, context, retry, stopping, tools, branching, budgeting, and execution-world policies. Designed for DSH but usable as a harness-neutral methodology."
status: proposal
version: "0.2.0"
date: "2026-08-18"
---

# Harness Runtime Optimizer

Turn an agent harness from a static orchestration scaffold into an **experimentable runtime policy layer**. This skill does NOT ask only “can this project migrate to DSH?” It asks:

> Given the same task distribution, where is the runtime wasting intelligence, latency, tokens, tool calls, or reliability — and which policy change measurably improves it?

The output is an evidence-backed optimization plan and, when execution is authorized, a controlled experiment loop. Never declare an optimization successful without before/after metrics.

## Mental model

Treat the harness runtime as a policy `π` operating over observable state `s_t`:

`action_t = π(s_t)`

where actions include model choice, context construction, tool exposure, retry/fallback, branch/fork, stopping, budget allocation, execution environment, and merge/arbiter behavior.

The target is not “maximum benchmark score at any cost.” Optimize a multi-objective utility such as:

`U = task_quality - λ1*cost - λ2*latency - λ3*failure_risk - λ4*operational_complexity`

Weights must come from the user/project objective. If no weights are given, report the Pareto frontier instead of inventing a single winner.

## Inputs

Use any available combination:

1. **Project source** — README/docs + runtime/orchestrator files + model/tool/session code.
2. **Recon report** — ideally from `repo-recon`.
3. **DSH enhancement report** — ideally from `dsh-enhancement-analysis`.
4. **Runtime traces** — session logs, event traces, token/cost/latency logs, tool-call traces, errors, evaluator scores.
5. **Task corpus** — representative tasks with expected outcomes or evaluation criteria.
6. **DSH source** — `~/git/deepseek-harness/` when DSH-specific facts need verification.

Do not block if some inputs are missing. Start with static analysis, explicitly mark unobservable quantities, and propose the smallest instrumentation needed to measure them.

## Phase 0 — Define the optimization contract

Before changing policy, write down:

- **Task distribution**: what tasks/runs are representative; segment by easy/mechanical, reasoning-heavy, tool-heavy, long-horizon, failure-prone if useful.
- **Primary objective(s)**: quality, pass rate, reliability, latency, token cost, dollar cost, tool efficiency, reproducibility, safety, or operator burden.
- **Guardrails**: metrics that may not regress beyond a stated tolerance.
- **Decision rule**: what magnitude of improvement is enough to adopt a policy.

Default decision rule when the user gives none: no material quality regression; prefer a policy only if it yields a clear improvement in at least one operational metric and is stable across task segments. Label this as a provisional rule.

## Phase 1 — Runtime observability map

Build a stage-by-stage runtime map:

`request → context build → model request → model response → tool selection → tool execution → observation → next turn → stopping → final output`

For every stage, inventory what is currently observable and what policy controls it. Capture at minimum when available:

- task/run/session id and task segment
- model/provider and model-switch events
- prompt/context tokens; completion tokens; context growth per turn
- wall-clock latency by stage and total latency
- tool calls: count, type, duplicate calls, failed calls, retries
- model calls: count, retry/fallback chain, timeout/rate-limit events
- branch/fork count, arbiter/merge outcome
- stop reason and turn count
- task outcome / evaluator score / human accept-reject
- estimated or actual monetary cost

For DSH, prefer event-waterfall/session-log instrumentation over scattered custom logging. The event stream should be treated as the canonical runtime trace where feasible.

Deliverable: **Observability Coverage Table** with `metric → source → coverage → missing instrumentation → priority`.

## Phase 2 — Diagnose runtime waste

Analyze traces and source to identify **policy failures**, not merely code smells. Use `references/runtime-policy-catalog.md`.

Common signatures:

- expensive model used for mechanical steps
- weak model used where reasoning failures dominate
- context grows monotonically with low marginal value
- repeated retrieval/tool calls for already-known information
- retries repeat the same request without changing conditions
- fallback happens too late or after budget exhaustion
- tool menu is too broad and increases selection errors
- agent continues after answer confidence is already sufficient
- early stopping truncates hard tasks
- serial independent work that could be forked/parallelized
- parallel/forked work where merge cost exceeds benefit
- disagreement is unresolved or resolved by an arbitrary last writer
- dirty/local execution environment causes nondeterminism
- branch explosion creates cost with no quality gain

For every diagnosis include trace or `file:line` evidence and an estimated impact surface: quality / cost / latency / reliability / complexity.

## Phase 3 — Generate policy interventions

Generate interventions across these policy families:

1. **Model routing policy** — choose model by stage, task features, confidence, budget, or failure state; support hot-swap mid-run.
2. **Context policy** — select, compress, summarize, evict, pin, or retrieve context based on expected marginal utility.
3. **Retry & fallback policy** — retry only when failure is plausibly transient; vary model/prompt/tool/environment rather than blind repetition.
4. **Stopping policy** — terminate on task completion, confidence/evaluator threshold, diminishing returns, or budget boundary.
5. **Tool policy** — dynamically expose subsets of tools; prefer cached/reused observations; impose call budgets or validation gates.
6. **Branching/fork policy** — fork only on high-value uncertainty; cap width/depth; select independent models/strategies deliberately.
7. **Merge/arbiter policy** — compare, rank, reconcile, or synthesize branches using deterministic rules or a designated judge.
8. **Budget policy** — allocate token/time/tool/model budgets by task class and stage; reserve budget for recovery.
9. **Execution-world policy** — choose local/container/VM/sandbox providers based on isolation, dependency, reproducibility, and security needs.
10. **Memory/session policy** — decide what becomes durable session state, ephemeral scratch state, cache, or derived summary.

Each intervention must state:

`hypothesis → trigger → policy change → expected benefit → likely failure mode → metrics → rollback condition`

For DSH implementations, map interventions onto event hooks, service providers, session logs, `ctx.sessions.fork()`, or execution-world swaps. Re-check DSH source if the exact API surface may have drifted.

## Phase 4 — Experiment design

Never compare policies on different task mixes if a paired comparison is possible.

Preferred design:

- freeze a representative task set
- establish **baseline policy P0**
- change ONE major policy dimension for **candidate P1** unless testing an intentionally bundled architecture
- replay/execute P0 and P1 on the same tasks
- use DSH session fork/replay where semantically valid to reduce upstream variance
- record quality, pass/fail, cost, latency, tool/model calls, retries, turn count, and failure taxonomy
- segment results by task type; aggregate averages alone can hide regressions

If stochasticity matters, run repeated trials where feasible. Report sample size and uncertainty; do not overstate tiny samples.

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

Add project-specific metrics when they matter.

## Phase 5 — Decide: adopt, reject, or segment

Use one of three verdicts:

- **ADOPT** — candidate dominates baseline or meets the stated utility/guardrail rule.
- **REJECT** — no meaningful improvement, unstable gains, unacceptable regressions, or operational complexity exceeds value.
- **SEGMENT** — candidate wins only for identifiable task classes; convert it into a routing rule rather than a global default.

Prefer SEGMENT over averaging away heterogeneous results. A sophisticated runtime policy should route by regime instead of forcing one universal configuration.

## Phase 6 — Iterate toward an adaptive harness

After several validated interventions, construct a policy table or controller:

`task/runtime features → policy choice → observed reward`

Start deterministic and interpretable. Only introduce learned/bandit-style policy selection when:

- enough trace volume exists,
- reward is measurable with acceptable noise,
- exploration cost is bounded,
- rollback and hard guardrails exist.

The harness should become **adaptive**, not opaque.

## DSH-specific leverage

DSH is especially suitable because runtime policy can live outside business logic:

- `agent/request` interception → model routing, budgets, retries, fallbacks
- event waterfall → instrumentation, policy hooks, stopping, tracing
- session-as-log → replayable experiments and reproducibility
- `ctx.sessions.fork()` → paired branch/model experiments and uncertainty resolution
- service-key injection → swappable cache, memory, tools, models, filesystems, subprocess worlds
- swappable execution world → isolation/reproducibility experiments without rewriting tools

Do not treat these as automatic wins. Measure whether the primitive actually improves the target workload.

## Outputs

Default report path: `dsh-scan/runtime-opt-<project>.md` using `templates/runtime-optimization-report.md`.

A complete report contains:

1. optimization contract
2. runtime/observability map
3. baseline scorecard
4. diagnosed waste with evidence
5. ranked policy hypotheses
6. experiment design
7. before/after results when runs are authorized
8. adopt/reject/segment decisions
9. resulting runtime policy table
10. next experiment queue

## Rules

- Evidence first: runtime claims need trace evidence; static architecture claims need `file:line` evidence.
- One variable at a time by default; explicitly label bundled experiments.
- Never optimize cost/latency by silently sacrificing quality.
- Never claim causality from an uncontrolled before/after anecdote.
- Report heterogeneity by task segment when it changes the decision.
- No autonomous production rollout. Changes to production policy require explicit user approval.
- No self-modifying policy without hard caps, logging, rollback, and user-approved objectives.
- If no reliable evaluator exists, improving the evaluator/instrumentation is Priority 0.
