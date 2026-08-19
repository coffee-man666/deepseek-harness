# Runtime Policy Catalog

Use this as a diagnosis/intervention index, not as a checklist that must all be implemented.

| Policy family | Observable failure signature | Candidate intervention | Core metrics | DSH seam |
|---|---|---|---|---|
| Model routing | expensive model on easy steps; weak model on hard steps | stage/task-aware router; escalation on uncertainty | quality, model cost, latency | `agent/request` interceptor / `ctx.llm` |
| Context | token growth with flat quality; stale/redundant history | pin/evict/summarize/retrieve by value | input tokens, quality, turns | session/event context hooks |
| Retry | repeated identical failures | classify transient vs semantic failures; mutate retry strategy | retry success, wasted calls, latency | request/error interceptor |
| Fallback | recovery only after budget exhaustion | early circuit breaker; model/provider/tool fallback | recovered success, cost, tail latency | request waterfall |
| Stopping | extra turns after sufficient answer | confidence/evaluator/diminishing-return stop | turns, latency, quality | `agent/turn-stopping` |
| Tool exposure | wrong-tool selection; huge tool menus | dynamic tool subsets by stage/task | tool error rate, calls, success | `ctx.tools` service / hook |
| Tool reuse/cache | duplicate fetches or repeated computation | observation cache, memoization, freshness policy | duplicate calls, latency, cache hit | injected cache service |
| Branching | hard tasks fail due to single path | selective fork by uncertainty/value | success gain per extra branch cost | `ctx.subagents.start()` fork provider |
| Branch control | branch explosion | width/depth budget; early prune | branches, cost, quality | delegation depth/orchestrator policy |
| Arbiter/merge | conflicting outputs; arbitrary choice | deterministic compare, judge, synthesize | disagreement resolution, quality | parallel subagents + judge plugin |
| Budget | easy tasks overspend; hard tasks run out of budget | task-class/stage budget allocation; recovery reserve | budget utilization, completion | request hook counters |
| Execution world | host contamination/nondeterminism | container/VM provider by task | reproducibility, setup failures | `ctx.fs` / `ctx.subprocess` swap |
| Session/memory | durable state polluted by scratch data | explicit durable/ephemeral/cache tiers | retrieval precision, state size | session service |
| Observability | no explanation for failures/cost | canonical event trace + run ids + stage timings | trace coverage | event waterfall / session log |

## High-value experiment patterns

### Cheap-first escalation
Use a lower-cost model for deterministic/mechanical work; escalate only if evaluator/confidence/failure signatures justify it.

### Reasoning-first, execution-cheap
Use a stronger model for plan formation or ambiguous judgment; route mechanical tool execution/formatting to a cheaper model.

### Fork on uncertainty, not by default
Trigger a second branch only when disagreement risk or task value exceeds the extra cost. Compare quality gain per incremental dollar/second.

### Retry with a changed condition
A retry should change something relevant: provider, model, prompt framing, context, tool, timeout, or execution world. Blind identical retries are usually waste.

### Context marginal-value pruning
Track whether added context improves evaluator outcome. Pin high-value facts, compress older interaction, and evict duplicated low-value trace content.

### Segment instead of compromise
If P1 helps hard reasoning tasks but hurts simple tasks, route by task features. Do not average into a mediocre global policy.
