# DSH Skills

[English](README.md) | 中文

`dsh-skills` 是一个 Codex 插件，包含三套用于仓库和 agent harness 的可复用工作流：

- `repo-recon`——对本地 Git 项目执行分阶段的只读侦察。
- `dsh-enhancement-analysis`——将编排痛点映射到 DeepSeek Harness 能力，并生成优先级报告。
- `harness-runtime-optimizer`——诊断运行时策略浪费、设计受控实验，并评估策略变更。

原始套件资源，包括 references 和报告模板，都保留在 [`skills/`](skills/) 下。该插件只提供指引，不会自动修改仓库或发布运行时策略。

## 安装

从本仓库的 marketplace 安装（需要支持插件的 Codex 版本）：

```sh
codex plugin marketplace add https://github.com/coffee-man666/deepseek-harness \
  --sparse .agents/plugins --sparse plugins/dsh-skills
codex plugin add dsh-skills@deepseek-harness
```

本地开发时改为指向本 checkout：`codex plugin marketplace add /path/to/deepseek-harness`。manifest 位于 [`plugin.json`](.codex-plugin/plugin.json)；套件版本记录在 [`skills/VERSION`](skills/VERSION)，必须与每个 SKILL.md frontmatter、manifest、provider 元数据一致（由本仓库的 `pnpm run verify-dsh-skills-sync` 强制）。
