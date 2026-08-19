# Agent Note: Lumen pipeline DSH-facade example

Status: implemented

English | [中文](2026-08-19-lumen-pipeline-facade-example.zh.md)

## Problem

The DSH enhancement analysis flow ends at a recommended migration path — "wrap the entry behind DSH as a facade, then pilot one stage" — but no example in the tree demonstrates that shape on a real external pipeline, and no run had measured what the facade actually costs or unlocks against the unchanged original stack.

## Decision

[`examples/lumen-pipeline/cordis.yml`](../../../../examples/lumen-pipeline/cordis.yml) runs the open-source [vibe-report-dashboard](https://github.com/coffee-man666/vibe-report-dashboard) ("Lumen") report pipeline — route → extract → theme → compose → refine — with its business code untouched: the driver swaps the project's OpenAI adapter object for a DSH-backed transport, so every `llmStructured` call becomes one spawn subagent child with an `outputSchema`, executed under the composition's `dsh-llm-retry`, `dsh-token-meter`, JSONL session persistence, and per-stage model routing.

The composition is deliberately minimal (credentials, one hand-declared `dsh-llm-pi-ai` route whose `baseURL` honors `DSH_PIPELINE_BASE_URL` for fault injection, agent spine, persistence, token meter, retry, projection, subagent + spawn provider). The driver measures per-stage wall time, exact provider usage folded from `session/event` usage chunks deduplicated by step, retry events, and child session ids. Schemas outside the structured-output subset (`minimum`, `minItems` in Lumen's RDM/maestro schemas) fall back to Lumen's own prompt-enforcement wording with the parsed value returned through the `toolCalls` path, and `max-tokens` truncation returns text so Lumen's validation-retry loop reacts — matching original adapter semantics.

The target project is addressed through `VIBE_ROOT` (fail-loud when unset) and is publicly clonable, so the with-key path is reproducible by anyone holding a provider key; no personal path is baked in, and the key never enters the tree. A comparison workspace outside the repository (fault-injecting proxy, original-stack runner instrumented at the same adapter seam, matrix scripts, showcase page) drives both stacks on the same model and endpoint; its results informed this note but are not artifacts of this repository.

Pilot findings for the seams involved, each observed in real runs:

- The structured-output JSON Schema subset rejects `minimum`/`minItems` (`packages/core/tools/src/json-schema.ts` keyword allowlist), so ordinary third-party schemas fall off the native capture path more often than expected.
- `AgentOptions` (`packages/core/agent/src/runtime-types.ts`) exposes only provider/model/maxTokens: per-stage temperature cannot flow through subagent delegation.
- Children join the parent spine's full tool roster (a pipeline child saw `job_list`), so an orchestration-only composition needs a minimal spine or the leak widens prompts.
- `dsh-llm-retry`'s agent-loop-only boundary is load-bearing: choosing subagent stages (rather than raw `ctx.llm.stream`) is what makes facade retry work at all.

## Alternatives considered

**Raw `ctx.llm.stream` transport instead of subagent children** — rejected: no structured-output capture at the llm seam and no retry (llm-retry hangs off `agent/request-error`), recreating the original stack's weaknesses inside DSH clothing.

**Copy the pipeline stages into the example** — rejected: the facade claim is only credible when the target project's modules run unchanged; copying would silently fork the prompts.

**Commit the comparison matrix into the repository** — rejected: it spends a real API key, depends on one operator's environment, and demos are not regression surfaces; the keyless boot smoke and the self-skipping with-key run are the testable boundary.

## Consequences

The example needs `VIBE_ROOT` and `DEEPSEEK_API_KEY` to exercise the model path (both tests self-skip or fail loud otherwise); since the target project is open source, that is a clone and a key, not a private dependency. It documents a migration pattern and its measured costs rather than shipping a standalone product. The findings above are upstream candidates on their own — schema-subset widening, an AgentOptions temperature field, and a minimal orchestration spine are each small, evidence-backed changes.

## Verification

Keyless: `vitest run --config vitest.e2e.config.ts examples/lumen-pipeline/tests/keyless-smoke.e2e.ts` boots the composition through the Loader and resolves llm/subagents/tokenMeter. With-key (self-skipping): the full pipeline run asserts ok, ≥4 metered LLM calls, ≥4 child sessions, and nonzero input tokens. Matrix (published in the target project's `dsh/` directory): fault injection left the original stack dead 3/3 while the facade retried through 3/3; session-log replay recovered the RDM and skipped two LLM calls (9.8s vs 80.9s).
