# @deepseek-ai/dsh-skills

English | [中文](README.zh.md)

Bundled skill provider for three repository-analysis and runtime-optimization workflows: `repo-recon`, `dsh-enhancement-analysis`, and `harness-runtime-optimizer`.

## Plugin

The plugin requires `ctx.skills` and contributes one immutable `bundled` provider named `dsh-skills`.

The base profile carries the plugin row disabled; enable that row explicitly when the deployment wants these skills in its catalog.

| Skill | Purpose |
|---|---|
| `repo-recon` | Read-only reconnaissance of local Git projects, with a staged quick scan and deep dive. |
| `dsh-enhancement-analysis` | Map a project’s orchestration pain points to DeepSeek Harness primitives and produce a prioritized report without changing code. |
| `harness-runtime-optimizer` | Diagnose runtime-policy waste, design controlled experiments, and decide whether to adopt, reject, or segment a policy. |

## Resources

The published `skills/` directory preserves the suite’s `README.md`, `VERSION`, `CHANGELOG.md`, each `SKILL.md`, and every referenced `references/` and `templates/` file.

Each loaded skill exposes its own directory as `resourceBase`, so relative paths in the skill body resolve against the packaged resource directory.

## Model Experience

Indirectly, through `@deepseek-ai/dsh-tool-skill`, which advertises the three bundled skills in the session catalog and loads one selected body on demand.

#### KV Cache effect

When mounted, the provider adds three catalog summaries to the skill catalog; loading a skill appends its body and retained resource guidance. The provider is inert while it is not mounted.

## Known Limitations and Deferred Work

- **Static release contents** — changing a bundled skill requires publishing a new plugin version; the provider does not watch its package resources.
- **Local path assumptions** — some workflow instructions refer to a local DSH checkout or local project paths, so deployments should review those instructions before use.
- **Guidance only** — the skills produce reports and experiment decisions; they do not automatically modify repositories or roll out runtime policies.
