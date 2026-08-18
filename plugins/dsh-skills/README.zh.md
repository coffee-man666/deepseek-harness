# DSH Skills

[English](README.md) | 中文

`dsh-skills` 是一个 Codex 插件，包含三套用于仓库和 agent harness 的可复用工作流：

- `repo-recon`——对本地 Git 项目执行分阶段的只读侦察。
- `dsh-enhancement-analysis`——将编排痛点映射到 DeepSeek Harness 能力，并生成优先级报告。
- `harness-runtime-optimizer`——诊断运行时策略浪费、设计受控实验，并评估策略变更。

原始套件资源，包括 references 和报告模板，都保留在 [`skills/`](skills/) 下。该插件只提供指引，不会自动修改仓库或发布运行时策略。

## 本地安装

可以将此仓库作为本地插件安装，或在开发插件时将 Codex 指向 `plugins/dsh-skills`。manifest 位于 [`plugin.json`](.codex-plugin/plugin.json)。
