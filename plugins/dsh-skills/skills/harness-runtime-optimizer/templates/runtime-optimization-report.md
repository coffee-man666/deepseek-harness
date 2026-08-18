# Harness Runtime Optimization — <project>

- 日期：
- Project HEAD / DSH baseline：
- 输入：source / recon / enhancement report / traces / task corpus

## 1. Optimization Contract

- Task distribution：
- Primary objectives：
- Guardrails：
- Adoption rule：

## 2. Runtime & Observability Map

`request → context → model → tools → observation → next turn → stop → output`

| Stage | Current policy | Observable metrics | Evidence | Missing instrumentation |
|---|---|---|---|---|

## 3. Baseline P0

| Metric | Overall | Segment A | Segment B | Notes |
|---|---:|---:|---:|---|

## 4. Diagnosed Runtime Waste

| # | Failure signature | Evidence (trace / file:line) | Impact | Confidence |
|---|---|---|---|---|

## 5. Policy Hypotheses

| Rank | Policy family | Hypothesis | Trigger | Intervention | Expected gain | Failure mode |
|---:|---|---|---|---|---|---|

## 6. Experiment Design

- Baseline P0：
- Candidate P1：
- Frozen task set / sample size：
- Controlled variable：
- Evaluator：
- Repetitions / uncertainty：
- Rollback condition：

## 7. Experiment Scorecard

| Metric | P0 | P1 | Delta | Guardrail / target | Verdict |
|---|---:|---:|---:|---|---|
| Task success / quality | | | | | |
| Total latency | | | | | |
| Tokens | | | | | |
| Cost | | | | | |
| Tool calls | | | | | |
| Model calls | | | | | |
| Retry/fallback rate | | | | | |
| Turns | | | | | |

## 8. Decision

**ADOPT / REJECT / SEGMENT**

Rationale：

## 9. Resulting Runtime Policy Table

| Task/runtime condition | Model policy | Context policy | Tool policy | Retry/fallback | Branching | Stop/budget |
|---|---|---|---|---|---|---|

## 10. Next Experiment Queue

| Priority | Experiment | Expected information value | Cost/risk |
|---:|---|---|---|
