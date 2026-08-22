# lumen-pipeline

English | [中文](README.zh.md)

The Lumen report-to-dashboard pipeline (from the open-source
[vibe-report-dashboard](https://github.com/coffee-man666/vibe-report-dashboard)
project) run on the DSH llm stack as a **facade migration demo**: the target
project's pipeline code runs unchanged, and only its OpenAI adapter object is
swapped for a DSH-backed transport. Every `llmStructured` call becomes one
spawn subagent child with an `outputSchema`, executed under this composition's
retry policy, token meter, durable session log, and per-stage model routing.

The target project ships the measured side-by-side comparison (original stack
vs this facade, including injected-429 reliability runs and session-log
replay) in its [`dsh/` directory](https://github.com/coffee-man666/vibe-report-dashboard/tree/main/dsh),
with reproducible runners and a visual comparison page.

## Endpoint configuration (env-driven)

| Variable | Meaning | Default |
|---|---|---|
| `DSH_LLM_PROVIDER` | provider route name | `deepseek` |
| `DSH_LLM_API` | wire protocol (`openai-completions` / `anthropic-messages`) | `openai-completions` |
| `DSH_LLM_BASE_URL` | endpoint base URL (`DSH_PIPELINE_BASE_URL` honored for the fault proxy) | `https://api.deepseek.com/v1` |
| `DSH_LLM_API_KEY_ENV` | name of the env var holding the credential | `DEEPSEEK_API_KEY` |
| `DSH_LLM_MODELS` | model catalog CSV `id[:contextWindow[:maxTokens]]` | `deepseek-chat:65536:8192,deepseek-reasoner:65536:8192` |
| `DSH_MODEL_DEFAULT` | default model per stage | `deepseek-chat` |
| `DSH_MODEL_STRONG` | model for extract/compose under `--strong-extract` | `deepseek-reasoner` |

The target project's original stack is env-driven through its own `LUMEN_DEFAULT_*` variables.

## Run it

```sh
git clone https://github.com/coffee-man666/vibe-report-dashboard "$VIBE_ROOT"
DEEPSEEK_API_KEY=… VIBE_ROOT="$VIBE_ROOT" pnpm tsx driver.ts \
  --sample "$VIBE_ROOT/tests/samples/01-ev-industry-2026q1.md" --out /tmp/lumen-dsh
```

Options: `--strong-extract` routes extract/compose to `deepseek-reasoner`
(per-stage model routing demo); `--reuse-extract <manifest>` replays a prior
extract from its persisted session log instead of re-paying for it;
`DSH_PIPELINE_BASE_URL` points the provider route at another endpoint (for
example the target project's `dsh/fault-proxy/proxy.mjs`).

## Tests

- Keyless (always runs): `pnpm vitest run --config vitest.e2e.config.ts examples/lumen-pipeline/tests/keyless-smoke.e2e.ts` — boots this composition through the Loader and resolves llm/subagents/tokenMeter.
- With key (self-skips without `DEEPSEEK_API_KEY` and `VIBE_ROOT`): `examples/lumen-pipeline/tests/with-key.e2e.ts` — one full pipeline run with metering and session-log assertions.

The design decisions and the seam findings this pilot produced (schema-subset
rejections, AgentOptions temperature, orchestration-only tool rosters) are in
the [Agent Note](../../.agents/notes/implemented/feature/2026-08-19-lumen-pipeline-facade-example.md).
