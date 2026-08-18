# DSH Skills

**Version: 0.2.0**

A small skill suite for inspecting agentic repositories, identifying where DeepSeek Harness (DSH) primitives add value, and then optimizing the runtime loop with controlled experiments.

## Skills

### 1. `repo-recon`
Read-only architecture reconnaissance. Maps workflows, LLM call graphs, state/cache, retries/fallbacks, deployment, and orchestration pain points with evidence.

### 2. `dsh-enhancement-analysis`
Maps an existing project's orchestration pain points onto DSH primitives and produces an honest migration/enhancement roadmap: ✅ equivalent / ✅✅ stronger / ⚠️ hard port.

### 3. `harness-runtime-optimizer` — NEW in 0.2.0
Treats the harness as an experimentable runtime policy layer. Diagnoses waste and optimizes model routing, context, retry/fallback, stopping, tool exposure, branching/forking, merge/arbiter, budgets, sessions, and execution worlds using before/after metrics.

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
