# Agent Note：dsh-skills 重新打包为独立插件 dsh-lens

Status: implemented

[English](2026-08-22-dsh-skills-repackaged-as-dsh-lens.md) | 中文

## Problem

dsh-skills 技能套件在本 monorepo 里有两条发布面——Codex 插件（`plugins/dsh-skills`，经 `codex plugin marketplace` 安装）与随包 harness 提供方（`packages/skill/skills`，`@deepseek-ai/dsh-skills`，在 base profile 中禁用）——由 `verify-dsh-skills-sync` 强制字节一致。而目标受众其实是第三方 DSH 插件生态（`github.com/topics/dsh-plugin`）：那里的插件是以 `dsh plugin --profile <name> add` 安装的独立 npm 包，既不是 Codex marketplace 插件，也不是 harness 随包提供方。

## Decision

退役仓内两条发布面，套件只以 **dsh-lens** 发布（[github.com/coffee-man666/dsh-lens](https://github.com/coffee-man666/dsh-lens)，npm 包名 `@deepseek-ai/dsh-lens`，套件版本 0.5.0）：一个声明 `dsh.bundle.patch` 的 bundle 包、一个 `BUNDLED_SKILL_RANK` 上的随包技能提供方（`source: 'dsh-lens'`），以及从 0.4.0 逐字节迁移的 skills 树。技能名不变。

本仓删除项：`plugins/dsh-skills/`、`.agents/plugins/marketplace.json`、`packages/skill/skills/`、`scripts/verify-dsh-skills-sync.ts`、根脚本及其 `run-gates` 条目、workspace-constraints 资源条目、翻译配对排除项，以及 base profile 的行与依赖。`docs/subsystems/skills.md` 与 `docs/capability-seams.md`（含中文）现在以 `dsh-skill-badge` 作为随包提供方示例并指向 dsh-lens；生成目录已重新生成。

## Consequences

- 单一发布面移除了字节一致 gate 及其四个元数据载体；新仓库自带 `pnpm verify`（VERSION ↔ SKILL.md frontmatter ↔ provider METADATA ↔ package.json）。
- 套件版本独立于 harness 版本发布；peer 依赖（`@deepseek-ai/cordis`、`@deepseek-ai/dsh-skill`）由使用者的 DSH 安装提供，不隐含 harness 包的 npm 发布。
- base profile 少了一行永久禁用的插件；需要该套件的用户显式添加一个 bundle（`dsh plugin --profile <name> add github:coffee-man666/dsh-lens`）。
- 上述三篇 2026-08-18/19 feature note 中指向已删路径的链接就地去了链接化，让链接与包路径 gate 在历史记录上保持绿色。

## Alternatives considered

- 原地重命名 Codex 插件：否决——安装面仍是错的（Codex marketplace 而非 DSH 插件体系），且保留双发布同步 gate。
- 仓内做一个翻转 base profile `disabled` 开关的启用 bundle：否决——套件每次发布仍与 harness 发布耦合，还要维护两棵树。
- 保留随包提供方作为兜底：否决——同一组四个技能的两个事实源正是本次变更要消除的结构。
