# DSH Skills

**Version: 0.3.0**

A small skill suite for inspecting agentic repositories, identifying where DeepSeek Harness (DSH) primitives add value, and then optimizing the runtime loop with controlled experiments.

## Skills

### 1. `repo-recon`
Read-only architecture reconnaissance. Maps workflows, LLM call graphs, state/cache, retries/fallbacks, deployment, and orchestration pain points with evidence. Host-agnostic subagent delegation; sequential fallback when the host has no subagents.

### 2. `publish-screen` — NEW in 0.4.0
Screens a repository before it goes public: tracked content, file/directory paths, git history, identity terms, credential patterns; fix procedures from sed-scrub to fresh-history rebuild to private-flip containment.

### 3. `dsh-enhancement-analysis`
Maps an existing project's orchestration pain points onto DSH primitives and produces an honest migration/enhancement roadmap: ✅ equivalent / ✅✅ stronger / ⚠️ hard port. Non-DSH findings and open questions get their own report sections.

### 4. `harness-runtime-optimizer`
Treats the harness as an experimentable runtime policy layer. Diagnoses waste and optimizes model routing, context, retry/fallback, stopping, tool exposure, branching/forking, merge/arbiter, budgets, sessions, and execution worlds using before/after metrics.

## Artifact layout

All suite artifacts live under one `dsh-scan/` workspace directory: `recon-scan-<group>.md`, `recon-deep-<project>.md`, `dsh-enhance-<project>.md`, `runtime-opt-<project>.md`.

## Recommended flow

```text
repo-recon
    ↓
dsh-enhancement-analysis
    ↓
harness-runtime-optimizer
    ↓
validated runtime policy
```

The third skill can also be used directly on an already-running harness with traces and a representative task corpus.

## Design principle

The suite progresses from **context/architecture understanding** to **runtime-loop engineering**:

1. understand what the agent is doing;
2. identify which harness primitives can improve the architecture;
3. observe the live runtime;
4. formulate policy hypotheses;
5. run controlled experiments;
6. adopt, reject, or segment based on measured results.

No production rollout is automatic.
