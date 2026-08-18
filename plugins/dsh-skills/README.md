# DSH Skills

English | [中文](README.zh.md)

`dsh-skills` is a Codex plugin containing three reusable workflows for working with repositories and agent harnesses:

- `repo-recon` — perform staged, read-only reconnaissance of a local Git project.
- `dsh-enhancement-analysis` — map orchestration pain points to DeepSeek Harness capabilities and produce a prioritized report.
- `harness-runtime-optimizer` — diagnose runtime-policy waste, design controlled experiments, and evaluate policy changes.

The original suite resources, including references and report templates, are preserved under [`skills/`](skills/). The plugin is guidance-only: it does not modify repositories or roll out runtime policies automatically.

## Install locally

Install this repository as a local plugin, or point Codex at `plugins/dsh-skills` when developing the plugin. The manifest is [`plugin.json`](.codex-plugin/plugin.json).
