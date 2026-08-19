# DSH Skills

English | [中文](README.zh.md)

`dsh-skills` is a Codex plugin containing three reusable workflows for working with repositories and agent harnesses:

- `repo-recon` — perform staged, read-only reconnaissance of a local Git project.
- `dsh-enhancement-analysis` — map orchestration pain points to DeepSeek Harness capabilities and produce a prioritized report.
- `harness-runtime-optimizer` — diagnose runtime-policy waste, design controlled experiments, and evaluate policy changes.

The original suite resources, including references and report templates, are preserved under [`skills/`](skills/). The plugin is guidance-only: it does not modify repositories or roll out runtime policies automatically.

## Install

From this repository's marketplace (requires a Codex build with plugin support):

```sh
codex plugin marketplace add https://github.com/coffee-man666/deepseek-harness \
  --sparse .agents/plugins --sparse plugins/dsh-skills
codex plugin add dsh-skills@deepseek-harness
```

For local development, point Codex at this checkout instead: `codex plugin marketplace add /path/to/deepseek-harness`. The manifest is [`plugin.json`](.codex-plugin/plugin.json); the suite version lives in [`skills/VERSION`](skills/VERSION) and must match every SKILL.md frontmatter, the manifest, and the provider metadata (enforced by `pnpm run verify-dsh-skills-sync` in this repository).
