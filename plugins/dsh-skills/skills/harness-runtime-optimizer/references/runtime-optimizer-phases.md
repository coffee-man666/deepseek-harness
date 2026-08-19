# Runtime Optimizer — Phase Detail

Reference companion to `harness-runtime-optimizer`. The skill file owns the loop skeleton and the non-negotiable rules; this file owns the checklists.

## Phase 0 — Optimization contract

Before changing policy, write down:

- **Task distribution**: what tasks/runs are representative; segment by easy/mechanical, reasoning-heavy, tool-heavy, long-horizon, failure-prone if useful.
- **Primary objective(s)**: quality, pass rate, reliability, latency, token cost, dollar cost, tool efficiency, reproducibility, safety, or operator burden.
- **Guardrails**: metrics that may not regress beyond a stated tolerance.
- **Decision rule**: what magnitude of improvement is enough to adopt a policy.

Default decision rule when the user gives none: no material quality regression; prefer a policy only if it yields a clear improvement in at least one operational metric and is stable across task segments. Label this as a provisional rule.

## Phase 1 — Runtime observability map

For every stage of `request → context build → model request → model response → tool selection → tool execution → observation → next turn → stopping → final output`, inventory what is observable and what policy controls it. Capture at minimum when available:

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

## Phase 2 — Waste diagnosis signatures

Common signatures (policy failures, not code smells):

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

## Phase 3 — Policy families

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

Each intervention must state: `hypothesis → trigger → policy change → expected benefit → likely failure mode → metrics → rollback condition`.

## Phase 4 — Experiment design

Never compare policies on different task mixes if a paired comparison is possible. Preferred design:

- freeze a representative task set
- establish **baseline policy P0**
- change ONE major policy dimension for **candidate P1** unless testing an intentionally bundled architecture
- replay/execute P0 and P1 on the same tasks
- use DSH session replay and parallel subagent delegation where semantically valid to reduce upstream variance
- record quality, pass/fail, cost, latency, tool/model calls, retries, turn count, and failure taxonomy
- segment results by task type; aggregate averages alone can hide regressions

If stochasticity matters, run repeated trials where feasible. Report sample size and uncertainty; do not overstate tiny samples.

## Phase 6 — Toward an adaptive harness

After several validated interventions, construct a policy table or controller: `task/runtime features → policy choice → observed reward`. Start deterministic and interpretable. Only introduce learned/bandit-style policy selection when: enough trace volume exists; reward is measurable with acceptable noise; exploration cost is bounded; rollback and hard guardrails exist. The harness should become **adaptive**, not opaque.
